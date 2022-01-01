const mongoose = require('mongoose');
const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');
const { Resource } = require("./models/schema")

let connection = null

const connect = async () => {
    if (connection && mongoose.connection.readyState === 1) return await connection
    const conn = await mongoose.connect(process.env.DB_CONNECT);
    connection = conn
    return connection
};

const S3 = new AWS.S3({
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
    region: process.env.S3_REGION,
    signatureVersion: "v4"
});
const URL_EXPIRATION_SECONDS = 300

const createResponse = (status, body) => ({
    statusCode: status,
    body: JSON.stringify(body),
    headers: {
        "Access-Control-Allow-Origin": "*",
        'Access-Control-Allow-Credentials': false,
        "Content-Type": "application/json",
        "Access-Control-Allow-Methods":"OPTIONS,POST,GET,PUT,DELETE"
    }
})

exports.upload = async (event) => {
    if (!event?.headers?.Authorization) return createResponse(400, { message: "need_token" })
    const token = event.headers.Authorization.replace("Bearer ", "")

    try {
        jwt.verify(token, process.env.MASTER_PASSWORD)
    } catch (err) {
        return createResponse(403, { message: "wrong_token" })
    }

    const { path } = JSON.parse(event.body)
    if (!path) return createResponse(400, "need_path")

    const uploadURL = await S3.getSignedUrlPromise('putObject', {
        Bucket: process.env.S3_BUCKET,
        Key: path,
        Expires: URL_EXPIRATION_SECONDS,
        ACL: 'public-read'
    });

    return createResponse(200, { uploadURL })
}

exports.resourceList = async (event) => {
    if (!event?.headers?.Authorization) return createResponse(400, { message: "need_token" })
    const token = event.headers.Authorization.replace("Bearer ", "")

    try {
        jwt.verify(token, process.env.MASTER_PASSWORD)
    } catch (err) {
        return createResponse(403, { message: "wrong_token" })
    }

    const fileList = await S3.listObjects({
        Bucket: process.env.S3_BUCKET,
    }).promise()

    return createResponse(200, fileList)
}

exports.delete = async (event) => {
    if (!event?.headers?.Authorization) return createResponse(400, { message: "need_token" })
    const token = event.headers.Authorization.replace("Bearer ", "")

    try {
        jwt.verify(token, process.env.MASTER_PASSWORD)
    } catch (err) {
        return createResponse(403, { message: "wrong_token" })
    }

    const path = event?.queryStringParameters?.path
    if (!path) return createResponse(400, { message: "need_path" })

    const deleteObject = await S3.deleteObject({
        Bucket: process.env.S3_BUCKET,
        Key: path,
    }).promise()

    return createResponse(200, { deleteObject })
}