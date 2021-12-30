const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { Webhook, MessageBuilder } = require("discord-webhook-node")
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

const serverHook = new Webhook(process.env.DISCORD_SERVER_MESSAGE_WEBHOOK)

exports.serverCreate = async (event) => {
    if (!event?.headers?.Authorization) return createResponse(400, { message: "need_token" })
    const token = event.headers.Authorization.replace("Bearer ", "")

    const { id, name, address, checkURL, img } = JSON.parse(event.body)
    if (!id || !name || !address || !checkURL || !img) return createResponse(400, { message: "need_serverInfo" })

    let verifiedToken
    try {
        verifiedToken = jwt.verify(token, process.env.MASTER_PASSWORD)
    } catch (err) {
        return createResponse(403, { message: "wrong_token" })
    }

    await connect()

    const accountInfo = await User.findOne({ _id: verifiedToken.id })
    if (!accountInfo) return createResponse(400, { message: verifiedToken.id })

    const alreadyServer = await Server.findOne({ svId: id })
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
        svId: id,
        svName: name,
        svAddress: address,
        svCheckURL: checkURL,
        svImg: img,
        svAuthor: accountInfo._id,
        svApiKey: newToken
    })

    const res = await serverInfo.save()

    return createResponse(200, { message: "server_created", data: res })
}

exports.serverInfo = async (event) => {
    if (!event?.headers?.Authorization) return createResponse(400, { message: "need_token" })
    const token = event.headers.Authorization.replace("Bearer ", "")
    if (!token) return createResponse(400, { message: "need_token" })

    const serverId = event?.pathParameters?.serverId
    if (!serverId) return createResponse(400, { message: "need_serverId" })

    try {
        jwt.verify(token, process.env.MASTER_PASSWORD)
    } catch (err) {
        return createResponse(403, { message: "wrong_token" })
    }

    await connect()
    const server = await Server.findOne({ svId: serverId })
    if (!server) return createResponse(202, { message: "server_not_found" })

    return createResponse(200, { message: "server_found", data: server })
}

exports.serversInfo = async (event) => {
    if (!event?.headers?.Authorization) return createResponse(400, { message: "need_token" })
    const token = event.headers.Authorization.replace("Bearer ", "")
    if (!token) return createResponse(400, { message: "need_token" })

    try {
        jwt.verify(token, process.env.MASTER_PASSWORD)
    } catch (err) {
        return createResponse(403, { message: "wrong_token" })
    }

    await connect()

    const server = await Server.find({})

    return createResponse(200, { message: "servers_found", data: server })
}

exports.serverSendMessage = async (event) => {
    if (!event?.headers?.Authorization) return createResponse(400, { message: "need_api_key" })
    const key = event.headers.Authorization.replace("Bearer ", "")

    const serverId = event?.pathParameters?.serverId
    if (!serverId) return createResponse(400, { message: "need_serverId" })

    const reqMsg = JSON.parse(event.body)
    if (!reqMsg.content || !reqMsg.level) return createResponse(400, { message: "need_content_and_level" })

    try {
        jwt.verify(key, process.env.MASTER_PASSWORD)
    } catch (err) {
        return createResponse(403, { message: "wrong_api_key " + key })
    }

    await connect()
    const server = await Server.findOne({ _id: serverId })
    if (!server) return createResponse(202, { message: "server_not_found" })

    const msg = new Message({
        msgContent: reqMsg.content,
        msgAuthorId: server.svId,
        msgLevel: reqMsg.level
    })

    const ResMsg = await msg.save()

    let color
    switch (reqMsg.level) {
        case "info":
            color = "#4AD175"
            break;
    
        case "warn":
            color = "#E8CC3E"
            break;

        case "error":
            color = "#FC3333"
            break;

        default:
            color = "#3359FC"
            break;
    }

    const embed = new MessageBuilder()
        .setTitle(reqMsg.content)
        .setColor(color)
        .setFooter(server.svName, server.svImg)
        .setTimestamp()

    await serverHook.send(embed)

    return createResponse(200, { message: "message_send", data: ResMsg })
}

exports.serverMessageList = async (event) => {
    if (!event?.headers?.Authorization) return createResponse(400, { message: "need_token" })
    const token = event.headers.Authorization.replace("Bearer ", "")

    const serverId = event?.pathParameters?.serverId
    if (!serverId) return createResponse(400, { message: "need_serverId" })

    try {
        jwt.verify(token, process.env.MASTER_PASSWORD)
    } catch (err) {
        return createResponse(403, { message: "wrong_token" })
    }

    await connect()

    const server = await Server.findOne({ svId: serverId })
    if (!server) if (!server) return createResponse(202, { message: "server_not_found" })

    const messages = await Message.find({ msgAuthorId: serverId })
    if (!messages) return createResponse(202, { message: "message_not_found" })

    return createResponse(200, { message: "messages_found", data: messages })
}

exports.serversMessageList = async (event) => {
    if (!event?.headers?.Authorization) return createResponse(400, { message: "need_token" })
    const token = event.headers.Authorization.replace("Bearer ", "")

    try {
        jwt.verify(token, process.env.MASTER_PASSWORD)
    } catch (err) {
        return createResponse(403, { message: "wrong_token" })
    }

    await connect()
    const messages = await Message.find({})
    if (!messages) return createResponse(202, { message: "message_not_found" })

    return createResponse(200, { message: "messages_found", data: messages })
}

exports.serverMessageRemove = async (event) => {
    if (!event?.headers?.Authorization) return createResponse(400, { message: "need_token" })
    const token = event.headers.Authorization.replace("Bearer ", "")

    const messageId = event?.queryStringParameters?.messageId
    if (!messageId) return createResponse(400, { message: "need_messageId" })

    try {
        jwt.verify(token, process.env.MASTER_PASSWORD)
    } catch (err) {
        return createResponse(403, { message: "wrong_token" })
    }

    await connect()

    const message = await Message.findOne({ _id: messageId })
    if (!message) return createResponse(202, { message: "message_not_found" })

    await Message.remove({ _id: messageId })
    return createResponse(200, { "message": "message_removed" })
}

exports.serverPatch = async (event) => {
    const { name, address, checkURL, img, memo } = JSON.parse(event.body)

    if (!event?.headers?.Authorization) return createResponse(400, { message: "need_token" })
    const token = event.headers.Authorization.replace("Bearer ", "")

    const serverId = event?.pathParameters?.serverId
    if (!serverId) return createResponse(400, { message: "need_serverId" })

    try {
        jwt.verify(token, process.env.MASTER_PASSWORD)
    } catch (err) {
        return createResponse(403, { message: "wrong_token" })
    }

    await connect()

    const server = await Server.findOne({ svId: serverId })
    if (!server) if (!server) return createResponse(202, { message: "server_not_found" })

    const update = {}
    if (name) update.svName = name
    if (address) update.svAddress = address
    if (checkURL) update.svCheckURL = checkURL
    if (img) update.svImg = img
    if (memo) update.svMemo = memo

    const newServer = await Server.findOneAndUpdate({ svId: serverId }, update, { new: true })
    return createResponse(200, { "message": "server_patched", newServer })
}

exports.serverRemove = async (event) => {
    if (!event?.headers?.Authorization) return createResponse(400, { message: "need_token" })
    const token = event.headers.Authorization.replace("Bearer ", "")

    const serverId = event?.pathParameters?.serverId
    if (!serverId) return createResponse(400, { message: "need_serverId" })

    try {
        jwt.verify(token, process.env.MASTER_PASSWORD)
    } catch (err) {
        return createResponse(403, { message: "wrong_token" })
    }

    await connect()

    const server = await Server.findOne({ svId: serverId })
    if (!server) if (!server) return createResponse(202, { message: "server_not_found" })

    await Server.remove({ svId: serverId })
    return createResponse(200, { "message": "server_removed" })
}