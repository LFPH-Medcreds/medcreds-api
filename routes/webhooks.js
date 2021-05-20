const router = require('koa-router')();

const {
  Callback,
  User,
  Event,
  Verification,
  WalletCredential,
  Organization,
  WalletVerification,
  AgencyVerification
  // Netki
} = require('../models');

const { logRoutes, sleep } = require('../src/util');
const { withWalletId, withTenantId } = require('../services/withers');

module.exports = ({ psql, knex }) => {
  Callback.knex(psql);
  User.knex(psql);
  Event.knex(psql);
  Verification.knex(psql);
  AgencyVerification.knex(psql);
  WalletCredential.knex(psql);
  WalletVerification.knex(psql);
  Organization.knex(psql);
  // Netki.knex(psql)

  router.post('/webhooks/notify/:tenant_id', webhookNotify); // id
  router.get('/webhooks/notify', webhookPending); // id

  // These functions allow us to programmatically control the Trinsic webhook definitions for each tenant.
  router.get('/webhooks/:tenant_id', webhookList);
  router.post('/webhooks/:tenant_id', webhookCreate); // object
  router.delete('/webhooks/:tenant_id/:id', webhookRemove); // id
  router.put('/webhooks/:tenant_id/:id/:state', webhookState); // id + state = 0 || 1

  //
  //
  // This was the Older way of doing things - If we don't use these in any provisioning process we should remove these 3
  //
  //
  router.post('/webhooks/delete', webhookRemove); // id
  router.post('/webhooks/enable', webhookEnable); // id
  router.post('/webhooks/disable', webhookDisable); // id

  router.post('/webhooks/netki', netkiCallback);

  /**
   * @description Handle late callbacks from Trinsic. Log to DB
   * @date 2021-01-01
   * @param tenant_id // to handle messages from more than one tenant on the same listener endpoint.
   */
  async function webhookNotify(ctx) {
    const { tenant_id: tenantId } = ctx.params;
    const { object_id: correlation, message_type: type, data } = ctx.request.body;

    const result = await Callback.query().insert({
      tenantId,
      correlation,
      type,
      data_object: ctx.request.body
    });

    const org = await withTenantId(tenantId);

    switch (type) {
      case 'credential_offer': {
        try {
          if (data && data.WalletId && correlation) {
            const walletId = data.WalletId;
            await withWalletId(walletId, async (wallet) => {
              await ctx.streetcred.withOrg(
                org.id,
                ({ custodian, custody }) => custody.acceptCredentialOffer(walletId, correlation)
                // custodian.post(`/api/${walletId}/credentials/${correlation}`)
              );

              let cred = await ctx.streetcred.withOrg(
                org.id,
                ({ custodian, custody }) => custody.getCredential(walletId, correlation)
                // custodian.get(`/api/${walletId}/credentials/${correlation}`)
              );

              if (wallet && wallet.users && wallet.users.length) {
                const user = wallet.users[0];
                await WalletCredential.query().insert({
                  credentialId: correlation,
                  userId: user && user.id,
                  schemaName: cred && cred.schemaId && cred.schemaId.split(':')[2],
                  schemaVersion: cred && cred.schemaId && cred.schemaId.split(':')[3],
                  state: cred.state
                });
              }
            });
          }
        } catch (e) {
          ctx.error(`Failed to accept credential offer ${correlation} walletId ${data.WalletId}.`, e);
        }
        break;
      }
      case 'credential_offer': {
        const { ConnectionId: connectionId } = data;
        ctx.log(`Tenant ${tenantId} has received a credential_request from: ${connectionId}`);
        break;
      }
      case 'new_connection': {
        try {
          const connectionId = correlation;
          if (!connectionId) return;
        } catch (e) {
          ctx.error('Failed to create connection.', e);
        }
        break;
      }
      case 'verification_request': {
        const verificationId = correlation;
        const { WalletId: walletId, ConnectionId: connectionId } = data;

        try {
          await withWalletId(walletId, async (wallet) => {
            if (wallet && wallet.users && wallet.users.length) {
              const user = wallet.users[0];

              // Just trying to figure out what is in the user object
              ctx.log('User: ', user);

              // TODO: use this to get the full details of the verification request
              // this is probably unnecessary overhead here as we are not processing the response just yet.
              // let ver = await ctx.streetcred.withOrg(org.id, ({ custody }) =>
              // custody.getVerification(walletId, verificationId)
              // );

              // Insert a holding record in the wallet_verifications table for later referral.
              const walletResult = WalletVerification.query().insert({
                org_id: 1,
                user_id: user.id,
                // policy_name: ver && ver.policy && ver.policy.name,
                // policy_version: ver && ver.policy && ver.policy.policy_version,
                verification_id: verificationId,
                config: data,
                // state: ver.state
                state: 'Proposed'
              });
            }
          });
        } catch (e) {
          ctx.error(
            `Failure to process the verification request notification. | verificationId ${verificationId} | walletId ${data.WalletId}.`,
            e
          );
          ctx.throw(500);
        }
        break;
      }
      case 'verification': {
        const verificationId = correlation;
        const { ConnectionId: connectionId } = data;

        try {
          ctx.log('callback - verification: ', ctx.request.body);
          await withTenantId(tenantId, async (orgId) => {
            if (orgId) {
              ctx.log(`Verification (${verificationId} completed for org (${orgId})`);

              // TODO: use this to get the full details of the verification request
              // this is probably unnecessary overhead here as we are not processing the response just yet?
              // let ver = await ctx.streetcred.withOrg(org.id, ({ agency }) =>
              // agency.getVerification(verificationId)
              // );

              // This should be UPDATING an existing record in the agency_verifications table but our flow does not yet create it so ...
              record = await AgencyVerification.query().where({ verification_id: verificationId }).first();
              if (record) {
                // TODO: Update the state of the existing record
              } else {
                ctx.error(`Could not find an existing verification record: ${verificationId}`);
                return;
              }
            } else {
              ctx.error('OrgID not found????');
              return;
            }
          });
        } catch (e) {
          ctx.error(
            `Failure to process the verification request notification. | verificationId ${verificationId} | tenantId ${tenantId}.`,
            e
          );
          ctx.throw(500);
        }
        break;
      }
      case 'new_inbox_message': {
        const { ConnectionId: connectionId } = data;
        ctx.log(`Tenant ${tenantId} has received a new message from ${connectionId}`);
        break;
      }
    }

    ctx.body = 'OK';
  }

  /**
   * @description Get all notification records in the db sorted newest first
   * @date 2021-01-01
   */
  async function webhookPending(ctx) {
    // TODO: should filter by pending state?
    ctx.log('get callbacks list:');
    ctx.body = (await Callback.query()).reverse();
  }

  // NOTES: The following functions allow us to programmatically define the webhook handling on Trinsic Tenants

  /**
   * @description List the registered callback handlers on Trinsic.
   * @date 2021-01-01
   */
  async function webhookList(ctx, next) {
    const { tenant_id: tenantId } = ctx.params;

    const org = await withTenantId(tenantId);

    await ctx.streetcred.withOrg(org.id, ({ agency }) => (ctx.body = agency.listWebhooks()));
  }

  /// NOTES: Don't create more that one webhook unless you want different systems to get notification.
  /// NOTES: Each webhook will receive the same notification message.
  /**
   * @description Create the a Webhook to handle late callbacks from Trinsic. Log record to DB
   * @date 2021-01-01
   * @param tenant_id // to handle messages from more than one tenant on the same listener endpoint.
   */
  async function webhookCreate(ctx, next) {
    const { url } = ctx.request.body;
    const { tenant_id: tenantId } = ctx.params;

    const org = await withTenantId(tenantId);

    await ctx.streetcred.withOrg(org.id, ({ agency }) =>
      agency
        .createWebhook({
          webhookParameters: {
            url,
            type: 'Notification'
          }
        })
        .then(async (r) => {
          let callback = {
            correlation: '',
            type: 'new webhook',
            data_object: r
          };
          const result = await Callback.query().insert(callback);

          ctx.body = {
            r,
            ...result
          };
        })
        .catch((e) => {
          ctx.error(e);
          ctx.throw(e);
        })
    );
  }

  /// FIXME: Sending an invalid number causes function to never complete. Trinsic Bug (Still?)
  /**
   * @description Delete the specified webhook Id.
   * @date 2021-01-01
   * @param tenant_id // to handle messages from more than one tenant on the same listener endpoint.
   */
  async function webhookRemove(ctx, next) {
    const { tenant_id: tenantId } = ctx.params;

    const org = await withTenantId(tenantId);

    await ctx.streetcred.withOrg(org.id, ({ agency }) => (ctx.body = agency.removeWebhook(id)));
  }

  /**
   * @description Enable a previously disabled webhook
   * @date 2021-01-01
   * @param tenant_id // to handle messages from more than one tenant on the same listener endpoint.
   */
  async function webhookEnable(ctx, next) {
    const { tenant_id: tenantId, id } = ctx.params;

    const org = await withTenantId(tenantId);

    await ctx.streetcred.withOrg(org.id, ({ agency }) => (ctx.body = agency.enableWebhook(id)));
  }

  /**
   * @description Disable a webhook without deleting it
   * @date 2021-01-01
   * @param tenant_id // to handle messages from more than one tenant on the same listener endpoint.
   */
  async function webhookDisable(ctx, next) {
    const { tenant_id: tenantId, id } = ctx.params;
    ctx.log('id: ', id);

    const org = await withTenantId(tenantId);

    await ctx.streetcred.withOrg(org.id, ({ agency }) => (ctx.body = agency.disableWebhook(id)));
  }

  /**
   * @description Enable/Disable a previously disabled webhook
   * @date 2021-01-01
   * @param tenant_id // to handle messages from more than one tenant on the same listener endpoint.
   */
  async function webhookState(ctx, next) {
    const { tenant_id: tenantId, id } = ctx.params;
    ctx.log('id: ', id);

    const org = await withTenantId(tenantId);

    if (ctx.request.params.state == 1) {
      await ctx.streetcred.withOrg(org.id, ({ agency }) => (ctx.body = agency.enableWebhook(id)));
    } else if (ctx.request.params.state == 0) {
      await ctx.streetcred.withOrg(org.id, ({ agency }) => (ctx.body = agency.disableWebhook(id)));
    }
  }

  /**
   * @description Function to handle callbacks from Netki Identity Verification Service
   * @date 2020-04-08
   */
  async function netkiCallback(ctx, next) {
    const netki_identity = ctx.request.body.identity;
    const netki_id = netki_identity.id;
    const netki_state = netki_identity.state;

    const person_identity = netki_identity.transaction_identity;

    const netki_access_code = person_identity.identity_access_code.code;

    const phone_numbers = person_identity.identity_phone_numbers;

    const identity_documents = netki_identity.transaction_identity.identity_documents;
    let selfie_url = '';
    identity_documents.forEach((element) => {
      if (element.document_type === 'selfie') {
        selfie_url = element.document;
      }
    });

    const other_data = {
      medical_license: person_identity.medical_license,
      death_date: person_identity.death_date,
      status: person_identity.status
    };

    const netki_transaction = {
      netki_id,
      netki_access_code,
      netki_state,
      transaction_metadata: netki_identity.transaction_metadata,
      created: netki_identity.created,
      updated: netki_identity.updated,
      errors: netki_identity.errors
    };

    const passport = {
      first_name: person_identity.first_name,
      middle_name: person_identity.middle_name,
      last_name: person_identity.last_name,
      birth_date: person_identity.birth_date,
      phone_number: phone_numbers[0].phone_number || '',
      selfie_url
    };

    // TODO: Evaluate the netki callback score to determine if we accept the onboarding.
    // TODO : How do we tie this Netki callback to a user to issue them the Passport credential

    // Log to DB
    let callback = {
      correlation: netki_access_code,
      type: 'netki',
      data_object: {
        netki_transaction,
        passport,
        other_data
      }
    };

    ctx.log('netki_callback');

    const result = await Callback.query().insert(callback);

    ctx.body = '';
  }

  logRoutes(router);

  return router;
};

// These are the Typescript models corresponding to Netki object data.

// export interface NetkiCallback {
//   identity: Identity;
// }
// export interface NetkiCallbackSmall {
//   identity: IdentitySmall;
// }

// export interface Identity {
//   notes?: null;
//   client: string;
//   contenttype?: number;
//   required_fields?: any[];
//   transaction_metadata?: TransactionMetadata;
//   state: string;
//   transaction_callbacks?: TransactionCallback[];
//   id: string;
//   errors?: any[];
//   transaction_notes?: TransactionNote[];
//   is_active: boolean;
//   phase?: string;
//   transaction_identity: TransactionIdentity;
//   updated: Date;
//   completed_by?: string;
//   created: Date;
// }

// export interface IdentitySmall {
//   notes?: null;
//   client: string;
//   contenttype?: number;
//   state: string;
//   id: string;
//   errors?: any[];
//   is_active: boolean;
//   transaction_identity: TransactionIdentity;
//   updated: Date;
//   completed_by?: string;
//   created: Date;
// }

// export interface TransactionCallback {
//   updated?: Date;
//   id?: number;
//   callback_counter?: number;
//   status_code?: number | null;
//   callback_duration?: null | string;
//   is_active?: boolean;
//   created?: Date;
//   callback_url?: string;
//   transaction?: string;
//   state?: string;
// }

// export interface TransactionIdentity {
//   identity_data_listings?: any[];
//   identity_accredited_investor_status?: null;
//   identity_data_sources?: IdentityDataSource[];
//   investor_type?: null;
//   country_code?: string;
//   identity_phone_numbers: IdentityPhoneNumber[];
//   last_name: string;
//   identity_access_code?: IdentityAccessCode;
//   state?: string;
//   declined_feedback_texts?: any[];
//   id?: string;
//   drivers_license?: string;
//   eye_color?: null;
//   identity_json_objects?: any[];
//   identity_emails?: any[];
//   passport_number?: string;
//   source_of_wealth?: null;
//   created?: Date;
//   status: string;
//   contenttype?: number;
//   alias?: string;
//   middle_name: null;
//   insurance_license?: null;
//   identity_addresses?: IdentityAddress[];
//   client_guid?: string;
//   ownership_percentage?: null;
//   death_date?: null;
//   title?: null;
//   errors?: any[];
//   is_active?: boolean;
//   first_name: string;
//   selected_country_code?: string;
//   is_accredited_investor?: boolean;
//   hair_color?: null;
//   weight?: null;
//   gender: string;
//   notes?: null;
//   ssn?: string;
//   medical_license?: null;
//   identity_media_references?: any[];
//   height?: null;
//   identity_documents: IdentityDocument[];
//   birth_location?: string;
//   updated?: Date;
//   tax_id?: null;
//   transaction?: string;
//   business?: null;
//   phone_is_validated?: boolean;
//   birth_date: Date;
//   locale?: string;
// }

// export interface IdentityAccessCode {
//   is_active?: boolean;
//   created?: Date;
//   code?: string;
//   business?: string;
//   parent_code?: null;
//   updated?: Date;
//   id?: string;
//   identity?: string;
//   child_codes?: any[];
// }

// export interface IdentityAddress {
//   is_active?: boolean;
//   unit?: null;
//   city?: null;
//   updated?: Date;
//   identity?: string;
//   postalcode?: null;
//   country_code?: string;
//   created?: Date;
//   address?: null;
//   state?: null;
//   score?: number;
//   id?: string;
// }

// export interface IdentityDataSource {
//   data_provider?: DataProvider;
//   reference_url?: null | string;
//   score?: null | string;
//   reviewer?: null;
//   id?: string;
//   comply_search_matches?: number;
//   is_active?: boolean;
//   is_reviewed?: boolean;
//   updated?: Date;
//   raw_data?: RawData;
//   identity?: string;
//   reviewed_date?: null;
//   created?: Date;
// }

// export interface DataProvider {
//   data_provider_type?: DataProviderType;
//   id?: number;
// }

// export interface DataProviderType {
//   id?: number;
//   updated?: Date;
//   identifier?: string;
//   is_active?: boolean;
//   created?: Date;
//   type_description?: string;
// }

// export interface RawData {
//   content?: Content;
//   code?: number;
//   status?: string;
//   Subscription?: Subscription;
//   AuthenticationSensitivity?: number;
//   Biographic?: Biographic;
//   Alerts?: Alert[];
//   Fields?: Field[];
//   Device?: Device;
//   DataFields?: Field[];
//   Images?: Image[];
//   InstanceId?: string;
//   EngineVersion?: string;
//   Regions?: Region[];
//   ProcessMode?: number;
//   LibraryVersion?: string;
//   Classification?: Classification;
//   Result?: number;
//   result?: Result;
//   statusCode?: number;
//   process?: string;
// }

// export interface Alert {
//   Information?: string;
//   RegionReferences?: string[];
//   DataFieldReferences?: string[];
//   Actions?: string;
//   Key?: string;
//   Result?: number;
//   ImageReferences?: any[];
//   Description?: string;
//   Disposition?: string;
//   Id?: string;
//   FieldReferences?: string[];
//   Name?: string;
// }

// export interface Biographic {
//   Photo?: string;
//   Age?: number;
//   FullName?: string;
//   ExpirationDate?: null;
//   Gender?: number;
//   BirthDate?: string;
// }

// export interface Classification {
//   OrientationChanged?: boolean;
//   Type?: Type;
//   PresentationChanged?: boolean;
//   Mode?: number;
//   ClassificationDetails?: ClassificationDetails;
// }

// export interface ClassificationDetails {
//   Back?: Type;
//   Front?: Type;
// }

// export interface Type {
//   Class?: number;
//   IssuerCode?: string;
//   IssueType?: string;
//   IssuerType?: number;
//   IssuerName?: string;
//   ClassCode?: null;
//   ClassName?: string;
//   SupportedImages?: SupportedImage[];
//   IsGeneric?: boolean;
//   Issue?: string;
//   Size?: number;
//   CountryCode?: string;
//   Id?: string;
//   GeographicRegions?: string[];
//   Name?: string;
// }

// export interface SupportedImage {
//   Light?: number;
//   Side?: number;
// }

// export interface Field {
//   Key?: string;
//   Id?: string;
//   IsImage?: boolean;
//   DataSource?: number;
//   RegionReference?: string;
//   Name?: string;
//   Reliability?: number;
//   Value?: string;
//   Description?: string;
//   Type?: TypeEnum;
//   RegionOfInterest?: RegionOfInterest;
//   DataFieldReferences?: string[];
// }

// export interface RegionOfInterest {
//   x?: number;
//   width?: number;
//   y?: number;
//   height?: number;
// }

// export enum TypeEnum {
//   Datetime = "datetime",
//   String = "string",
//   URI = "uri",
// }

// export interface Device {
//   SerialNumber?: string;
//   Type?: DeviceType;
//   HasMagneticStripeReader?: boolean;
//   HasContactlessChipReader?: boolean;
// }

// export interface DeviceType {
//   SensorType?: number;
//   Model?: string;
//   Manufacturer?: string;
// }

// export interface Image {
//   Side?: number;
//   Light?: number;
//   SharpnessMetric?: null;
//   GlareMetric?: null;
//   VerticalResolution?: number;
//   Uri?: string;
//   HorizontalResolution?: number;
//   Id?: string;
//   IsCropped?: boolean;
//   MimeType?: string;
//   IsTampered?: boolean;
// }

// export interface Region {
//   Key?: string;
//   Id?: string;
//   ImageReference?: string;
//   DocumentElement?: number;
//   Rectangle?: RegionOfInterest;
// }

// export interface Subscription {
//   IsTrial?: boolean;
//   Name?: string;
//   StorePII?: boolean;
//   IsDevelopment?: boolean;
//   IsActive?: boolean;
//   DocumentProcessMode?: number;
//   Id?: string;
// }

// export interface Content {
//   data?: Data;
// }

// export interface Data {
//   assignee_id?: number;
//   searcher?: Assignee;
//   total_hits?: number;
//   id?: number;
//   tags?: any[];
//   limit?: number;
//   share_url?: string;
//   created_at?: Date;
//   offset?: number;
//   updated_at?: Date;
//   ref?: string;
//   submitted_term?: string;
//   match_status?: string;
//   search_term?: string;
//   hits?: any[];
//   risk_level?: string;
//   client_ref?: null;
//   assignee?: Assignee;
//   filters?: Filters;
//   searcher_id?: number;
// }

// export interface Assignee {
//   created_at?: Date;
//   email?: string;
//   name?: string;
//   phone?: string;
//   id?: number;
// }

// export interface Filters {
//   fuzziness?: number;
//   types?: string[];
//   exact_match?: boolean;
//   remove_deceased?: number;
//   country_codes?: any[];
// }

// export interface Result {
//   confidence?: number;
//   faceMatch?: boolean;
//   distance?: number;
//   selfieFaces?: EFace[];
//   documentImageFaces?: EFace[];
// }

// export interface EFace {
//   bottomLeft?: BottomLeft;
//   topLeft?: BottomLeft;
//   topRight?: BottomLeft;
//   bottomRight?: BottomLeft;
//   detectConfidence?: number;
// }

// export interface BottomLeft {
//   y?: number;
//   x?: number;
// }

// export interface IdentityDocument {
//   contenttype?: number;
//   document_type: string;
//   state?: string;
//   can_bypass_expiration?: boolean;
//   id?: string;
//   reviewer?: null;
//   document: string;
//   mime_type?: null;
//   errors?: any[];
//   is_active?: boolean;
//   document_classification?: null | string;
//   is_reviewed?: boolean;
//   updated?: Date;
//   expiration_date?: null;
//   identity?: string;
//   identity_document_thumbnail?: any[];
//   country_code?: null | string;
//   reviewed_date?: null;
//   created?: Date;
// }

// export interface IdentityPhoneNumber {
//   updated?: Date;
//   id?: string;
//   identity?: string;
//   is_active?: boolean;
//   created?: Date;
//   phone_number: string;
// }

// export interface TransactionMetadata {
//   locale?: string;
//   is_active?: boolean;
//   brand?: null;
//   model?: null;
//   provider_calls?: null;
//   investor_type?: null;
//   app_version?: string;
//   country_code?: string;
//   gender?: null;
//   birth_year?: null;
//   display?: null;
//   state?: null;
//   id?: number;
//   media_hits?: null;
//   face_match_score?: null;
//   platform_version_name?: null;
//   device?: null;
//   document_classifications?: null;
//   audit_logs?: any[];
//   app_name?: string;
//   accredited_investor_status?: null;
//   updated?: Date;
//   sdk_version?: string;
//   platform_version?: string;
//   created?: Date;
//   transaction?: string;
//   hardware?: null;
//   sanction_hits?: null;
//   pep_hits?: null;
//   platform?: string;
//   acuant_alerts?: AcuantAlert[];
//   client_guid?: null;
//   manufacturer?: null;
//   product?: null;
// }

// export interface AcuantAlert {
//   name?: string;
//   alert_information?: Alert;
//   updated?: Date;
//   id?: number;
//   is_active?: boolean;
//   created?: Date;
// }

// export interface TransactionNote {
//   updated?: Date;
//   id?: number;
//   note?: string;
//   is_active?: boolean;
//   created?: Date;
//   transaction?: string;
//   created_by?: string;
// }
