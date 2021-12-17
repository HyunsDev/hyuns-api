const mongoose = require('mongoose');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { User, Server, Message } = require("./models/schema")

let connection = null

const connect = async () => {
    if (connection && mongoose.connection.readyState === 1) return await connection
    const conn = await mongoose.connect(process.env.DB_CONNECT);
    connection = conn
    return connection
};

const createResponse = (status, body) => ({
    statusCode: status,
    body: JSON.stringify(body)
})

exports.serverCreate = async (event) => {
    const { sv, token } = JSON.parse(event.body)
    if (!token) return createResponse(400, { message: "need_token" })
    if (!sv) return createResponse(400, { message: "need_serverInfo" })

    let verifiedToken
    try {
        verifiedToken = jwt.verify(token, process.env.MASTER_PASSWORD)
    } catch (err) {
        return createResponse(403, { message: "wrong_token" })
    }

    await connect()
    
    const accountInfo = await User.findOne({ userId: verifiedToken.id })
    if (!accountInfo) return createResponse(400, { message: "user_not_found" })

    const alreadyServer = await Server.findOne({ svName: sv.name })
    if (alreadyServer) return createResponse(202, { message: "already_server_exist" })

    const newToken = jwt.sign({
        id: accountInfo.id,
        name: accountInfo.name,
        img: accountInfo.img
    }, process.env.MASTER_PASSWORD, {
        issuer: 'api.hyuns.dev',
        subject: 'serverInfo'
    })

    const serverInfo = new Server({
        svName: sv.name,
        svAddress: sv.address,
        svCheckURL: sv.checkURL,
        svImg: sv.img,
        svAuthor: accountInfo._id,
        svApiKey: newToken
    })

    const res = await serverInfo.save()

    return createResponse(200, {message: "server_created", data: res})
}

exports.serverInfo = async (event) => {
    const token = event?.queryStringParameters?.token
    if (!token) return createResponse(400, { message: "need_token" })

    try {
        jwt.verify(token, process.env.MASTER_PASSWORD)
    } catch (err) {
        return createResponse(403, { message: "wrong_token" })
    }

    await connect()
    const server = await Server.findOne({ svName: event.pathParameters.serverName })
    if (!server) return createResponse(202, { message: "server_not_found" })

    return createResponse(200, {message: "server_found", data: server})
}

exports.serversInfo = async (event) => {
    const token = event?.queryStringParameters?.token
    if (!token) return createResponse(400, { message: "need_token" })

    try {
        jwt.verify(token, process.env.MASTER_PASSWORD)
    } catch (err) {
        return createResponse(403, { message: "wrong_token" })
    }

    await connect()
    const server = await Server.find({})

    return createResponse(200, {message: "servers_found", data: server})
}

exports.serverSendMessage = async (event) => {
    const headerKey = event?.headers?.Authorization
    if (!headerKey) return createResponse(400, { message: "need_api_key" })
    const key = headerKey.replace("Bearer ","")
    const serverId = event?.pathParameters?.serverName
    if (!serverId) return createResponse(400, { message: "need_serverId" })

    const reqMsg = JSON.parse(event.body)
    if(!reqMsg.content || !reqMsg.level) return createResponse(400, { message: "need_content_and_level" })

    try {
        jwt.verify(key, process.env.MASTER_PASSWORD)
    } catch (err) {
        return createResponse(403, { message: "wrong_api_key " + key })
    }

    await connect()
    const server = await Server.findOne({svId: serverId})
    if (!server) if (!server) return createResponse(202, { message: "server_not_found" })

    const msg = new Message({
        msgContent: reqMsg.content,
        msgAuthorId: server.svId,
        msgLevel: reqMsg.level
    })

    const ResMsg = await msg.save()

    return createResponse(200, {message: "message_send", data: ResMsg})
}

exports.serverMessageList = async (event) => {
    const token = event?.queryStringParameters?.token
    const serverId = event?.pathParameters?.serverName
    if (!token) return createResponse(400, { message: "need_token" })
    if (!serverId) return createResponse(400, { message: "need_serverId" })
    

    try {
        jwt.verify(token, process.env.MASTER_PASSWORD)
    } catch (err) {
        return createResponse(403, { message: "wrong_token" })
    }

    await connect()
    const messages = await Message.find({ msgAuthorId: serverId })
    if (!messages) return createResponse(202, { message: "message_not_found" })

    return createResponse(200, {message: "messages_found", data: messages})
}

exports.serversMessageList = async (event) => {
    const token = event?.queryStringParameters?.token
    if (!token) return createResponse(400, { message: "need_token" })

    try {
        jwt.verify(token, process.env.MASTER_PASSWORD)
    } catch (err) {
        return createResponse(403, { message: "wrong_token" })
    }

    await connect()
    const messages = await Message.find({})
    if (!messages) return createResponse(202, { message: "message_not_found" })

    return createResponse(200, {message: "messages_found", data: messages})
}