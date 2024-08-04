const AWS = require('aws-sdk');

AWS.config.update({
    accessKeyId: "N/A",
    secretAccessKey: "N/A",
    region: us-east-1
});

const s3 = new AWS.S3();
const dynamoDB = new AWS.DynamoDB.DocumentClient();

module.exports = { s3, dynamoDB };
