/**
 * @desc LogAggregateServer messages.
 */
const MESSAGES = {
  START_POST:               {code:  1, msg: 'POST %1.'},
  START_LISTEN:             {code:  2, msg: 'Listening on port %1.'}, // %1:Port
  CONNECTED:                {code:  3, msg: 'Connected %1'}, // %1: tableName
  SUCCESS_REGISTER:         {code:  4, msg: 'Succeeded to register the %1. rowCount=%d1'}, //  %1: tableName, %d1: rowCount
  FAILURE_REGISTER:         {code:  5, msg: 'Failed to register the %1. detail=%2'}, //  %1: tableName, %2: catch error
  FAILURE_DECODE:           {code:  6, msg: 'Failed to decode logs. detail=%1'}, //  %1: catch error
  FAILURE_CSVDECODE:        {code:  7, msg: '[decodeCsvLog] Failed to decodeCsvLog.'},
  FAILURE_CONNECT:          {code:  8, msg: 'Failed to connect the %1. detail=%2'}, //  %1: tableName, %2: catch error
  END_PGCLIENT:             {code:  9, msg: 'Connection of session of %1 ended'}, // %1: tableName
  REGISTERED_NULL_STRING:   {code: 10, msg: '"null" was registered because an embedded element isn\'t a character string.'},
  REGISTERED_NULL_DATE:     {code: 11, msg: '"null" was registered because an embedded element isn\'t a date form character string.'},
  REGISTERED_NULL_INTEGER:  {code: 12, msg: '"null" was registered because an embedded element isn\'t an integer.'},
  START_FUNCTION:           {code: 13, msg: 'START %1.'}, // %1: functionName
  PASS_FUNCTION:            {code: 14, msg: 'PASS %1. info=%2'}, // %1: functionName, %2: info
  SUCCESS_FETCH:            {code: 15, msg: 'Succeeded to fetch the %1. rowCount=%d1'}, //  %1: tableName, %d1: rowCount
  FAILURE_FETCH:            {code: 16, msg: 'Failed to fetch the %1. detail=%2'}, //  %1: tableName, %2: catch error

  EOD: {code: -1, msg: 'End of data'}
}

export default MESSAGES;
