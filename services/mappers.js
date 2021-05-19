const mapOrganizationDto = (o) => {
  if (!o) {
    return null;
  }

  return {
    id: o.id,
    logo: o.logo,
    name: o.name
  };
};

const mapUserDto = (u) => {
  if (!u) {
    return null;
  }

  return {
    email: u.email,
    name: u.name,
    photo: u.photo,
    phone: u.phone
  };
};

const mapVerificationDto = (v) => {
  if (!v) {
    return null;
  }

  return {
    id: v.id,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
    policyName: v.data?.verification?.policy?.name ?? v.data?.policyName,
    policyVersion: v.data?.verification?.policy?.version ?? v.data?.policyVersion,
    policyId: v.data?.policyId,
    verificationId: v.data?.verification?.verificationId ?? v.data?.orgVerificationId,
    recipient: v.data?.to,
    state: v.data?.state ?? v.data?.verification?.state,
    holder: mapUserDto(v.holder),
    verifier: mapUserDto(v.verifier),
    organization: mapOrganizationDto(v.organization)
  };
};

const mapCredentialDto = (c) => {
  if (!c) {
    return null;
  }

  return {
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    connectionId: c.connectionId,
    credentialId: c.credentialId,
    schemaName: c.schemaName,
    schemaVersion: c.schemaVersion,
    state: c.state
  };
};

const mapConnectionDto = (c) => {
  if (!c) {
    return null;
  }

  return {
    connectionId: c.connectionId,
    createdAt: c.createdAt,
    organization: mapOrganizationDto(c.organization)
  };
};

const mapOrganizationConnectionDto = (c) => {
  if (!c) {
    return null;
  }

  return {
    connectionId: c.connectionId,
    createdAt: c.createdAtUtc,
    name: c.name
  };
};

const mapTestDto = (t) => {
  if (!t) {
    return null;
  }

  return {
    subjectName: t.patient.name,
    connectionId: t.testRef?.split('.')[0],
    state: t.state.state,
    createdAt: t.createdAt,
    patientId: t.patientId,
    credential: t.credential,
    id: t.id
  };
};

module.exports = {
  mapTestDto,
  mapOrganizationConnectionDto,
  mapConnectionDto,
  mapUserDto,
  mapOrganizationDto,
  mapVerificationDto,
  mapCredentialDto
};
