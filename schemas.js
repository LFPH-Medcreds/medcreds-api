const { SCHEMA_TAG } = require('./config');

module.exports = {
  'Certified Self Check': {
    1.1: {
      attributeNames: [
        'firstName',
        'lastName',
        'closeProximity',
        'newSymptoms',
        'emergencySymptoms',
        'testAdvised',
        'issuedByName',
        'issuedOnBehalfOfName',
        'issuedDateUtc'
      ],
      supportRevocation: true,
      tag: SCHEMA_TAG
    }
  },
  'Certified Temperature': {
    '1.0': {
      attributeNames: [
        'firstName',
        'lastName',
        'tempC',
        'tempF',
        'issuedByName',
        'issuedOnBehalfOfName',
        'issuedDateUtc'
      ],
      supportRevocation: true,
      tag: SCHEMA_TAG
    }
  },
  'Certified Test Result': {
    '3.0': {
      attributeNames: [
        'testSubjectName',
        'testResult',
        'testManufacturerName',
        'testName',
        'testTime',
        'issuedByName',
        'issuedOnBehalfOfName'
      ],
      supportRevocation: true,
      tag: SCHEMA_TAG
    }
  }
};
