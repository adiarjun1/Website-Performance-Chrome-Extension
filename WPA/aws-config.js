const AWS = require('aws-sdk');

AWS.config.update({
    accessKeyId: AKIA5FTZDKXDM4L7DXRU,
    secretAccessKey: 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,
    region: us-east-1
});

const s3 = new AWS.S3();
const dynamoDB = new AWS.DynamoDB.DocumentClient();

module.exports = { s3, dynamoDB };