const mongoose = require('mongoose');
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

    try {
        jwt.verify(token, process.env.MASTER_PASSWORD)
    } catch (err) {
        return createResponse(403, { message: "wrong_token" })
    }

    const { group, key, value, isSecret, img } = JSON.parse(event.body)
    if (!group || !key || !value || !img || !isSecret) return createResponse(400, {message: "need_more_info"})

    await connect()
    
    const alreadyVar = await findOne({varGroup: group, varKey: key})
    if (alreadyVar) return createResponse(202, {message: "already_var_exist"})

    const variableInfo = new Var({
        varGroup: group,
        varKey: key,
        varValue: value,
        varIsSecret: isSecret === "true" ? true : false,
        varImg: img
    })

    const variable = await variableInfo.save()
    return createResponse(200, {message: "var_created", data: variable})
}