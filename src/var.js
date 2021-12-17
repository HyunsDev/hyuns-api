const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { User, Var } = require("./models/schema")

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

exports.varCreate = async (event) => {
    if (!event?.headers?.Authorization) return createResponse(400, { message: "need_token" })
    const token = event.headers.Authorization.replace("Bearer ", "")

    if (event.pathParameters.isSecret !== "secret" && event.pathParameters.isSecret !== "global") return createResponse(404, "")
    const isSecret = event.pathParameters.isSecret == "secret"

    try {
        jwt.verify(token, process.env.MASTER_PASSWORD)
    } catch (err) {
        return createResponse(403, { message: "wrong_token" })
    }

    const { group, key, value, img } = JSON.parse(event.body)
    if (!group || !key || !value || !img) return createResponse(400, {message: "need_more_info"})

    await connect()
    
    const alreadyVar = await Var.findOne({varGroup: group, varKey: key, varIsSecret: isSecret})
    if (alreadyVar) return createResponse(202, {message: "already_var_exist"})

    const variableInfo = new Var({
        varGroup: group,
        varKey: key,
        varValue: value,
        varIsSecret: isSecret,
        varImg: img
    })

    const variable = await variableInfo.save()
    return createResponse(200, {message: "var_created", data: variable})
}

exports.varList = async (event) => {
    if (!event?.headers?.Authorization) return createResponse(400, { message: "need_token" })
    const token = event.headers.Authorization.replace("Bearer ", "")

    if (event.pathParameters.isSecret !== "secret" && event.pathParameters.isSecret !== "global") return createResponse(404, "")
    const isSecret = event.pathParameters.isSecret == "secret"

    try {
        jwt.verify(token, process.env.MASTER_PASSWORD)
    } catch (err) {
        return createResponse(403, { message: "wrong_token" })
    }

    await connect()
    
    const variable = await Var.find({varIsSecret: isSecret})

    return createResponse(200, {message: "vars_found", data: variable})
}

exports.varListByGroup = async (event) => {
    if (!event?.headers?.Authorization) return createResponse(400, { message: "need_token" })
    const token = event.headers.Authorization.replace("Bearer ", "")

    if (event.pathParameters.isSecret !== "secret" && event.pathParameters.isSecret !== "global") return createResponse(404, "")
    const isSecret = event.pathParameters.isSecret == "secret"

    try {
        jwt.verify(token, process.env.MASTER_PASSWORD)
    } catch (err) {
        return createResponse(403, { message: "wrong_token" })
    }

    await connect()
    
    const variable = await Var.find({varIsSecret: isSecret, group: event.pathParameters.group})

    return createResponse(200, {message: "vars_found", data: variable})
}