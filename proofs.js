module.exports = {
  'Proof of Self Check': {
    1.1: {
      attributes: [
        {
          policyName: 'DailySelfCheck',
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
          restrictions: []
        }
      ],
      predicates: []
    }
  },
  'Proof of Temperature': {
    '1.0': {
      attributes: [
        {
          policyName: 'DailyTempCheck',
          attributeNames: [
            'firstName',
            'lastName',
            'tempC',
            'tempF',
            'issuedByName',
            'issuedOnBehalfOfName',
            'issuedDateUtc'
          ],
          restrictions: []
        }
      ],
      predicates: []
    }
  },
  'Proof of Test Result': {
    '3.0': {
      attributes: [
        {
          policyName: 'TestDetails',
          attributeNames: [
            'testSubjectName',
            'testResult',
            'testManufacturerName',
            'testName',
            'testTime',
            'issuedByName',
            'issuedOnBehalfOfName',
            'issuedDateUtc'
          ],
          restrictions: [
            {
              schemaId: 'Certified Test Result:3.0'
            }
          ]
        }
      ],
      predicates: []
    },
    3.1: {
      attributes: [
        {
          policyName: 'TestDetails',
          attributeNames: [
            'testSubjectName',
            'testResult',
            'testManufacturerName',
            'testName',
            'testTime',
            'issuedByName',
            'issuedOnBehalfOfName'
          ],
          restrictions: []
        }
      ],
      predicates: []
    }
  }
};
