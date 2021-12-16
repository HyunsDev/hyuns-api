const mongoose = require('mongoose');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { User } = require("./models/schema")


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

exports.createAccount = async (event) => {
    try {
        const { id, password, name, img, role, masterPassword } = JSON.parse(event.body)
        if (masterPassword !== process.env.MASTER_PASSWORD) return createResponse(403, { message: "Wrong masterPassword" })
        if (!id || !password || !name || !img || !role) return createResponse(400, { message: "need_more_info" })

        const salt = crypto.randomBytes(64).toString('base64')
        const hashedPassword = crypto.pbkdf2Sync(password, salt, 8, 64, 'sha512').toString('base64')

        await connect()

        const alreadyAccount = await User.findOne({ userId: id })

        if (alreadyAccount) return createResponse(202, { message: "이미 계정이 있습니다." })

        const story = new User({
            userId: id,
            userPassword: hashedPassword,
            userPasswordSalt: salt,
            userRole: role,
            userName: name,
            userImg: img
        })
        const res = await story.save()

        return createResponse(200, res)
    } catch (err) {
        return createResponse(500, { error: err })
    }
}

exports.login = async (event) => {
    try {
        const { id, password } = JSON.parse(event.body)
        if (!id) return createResponse(400, { message: "need_id" })
        if (!password) return createResponse(400, { message: "need_password" })

        await connect()
        const accountInfo = await User.findOne({ userId: id })
        if (!accountInfo) return createResponse(400, { message: "user_not_found" })

        const hashedPassword = crypto.pbkdf2Sync(password, accountInfo.userPasswordSalt, 8, 64, 'sha512').toString('base64')
        if (hashedPassword !== accountInfo.userPassword) return createResponse(403, { message: "wrong_password" })

        const token = jwt.sign({
            id: id,
            name: accountInfo.name,
            img: accountInfo.img
        }, process.env.MASTER_PASSWORD, {
            expiresIn: '7d',
            issuer: 'api.hyuns.dev',
            subject: 'userInfo'
        })

        return createResponse(200, { message: "login_successful", token })
    } catch (err) {
        return createResponse(500, { error: err })
    }
}

exports.deleteAccount = async (event) => {
    try {
        const { token } = JSON.parse(event.body)
        if (!token) return createResponse(400, { message: "need_token" })

        let verifiedToken
        try {
            verifiedToken = jwt.verify(token, process.env.MASTER_PASSWORD)
        } catch (err) {
            return createResponse(403, { message: "wrong_token" })
        }


        await connect()
        const accountInfo = await User.findOne({ userId: verifiedToken.id })
        if (!accountInfo) return createResponse(400, { message: "user_not_found" })

        await User.remove({ id: verifiedToken.id })
        return createResponse(200, { message: "account_deleted" })

    } catch (err) {
        return createResponse(500, err)
    }
}

exports.patchAccount = async (event) => {
    try {
        const { password, name, img, role, token } = JSON.parse(event.body)
        if (!token) return createResponse(400, { message: "need_token" })

        let verifiedToken
        try {
            verifiedToken = jwt.verify(token, process.env.MASTER_PASSWORD)
        } catch (err) {
            return createResponse(403, { message: "wrong_token" })
        }

        await connect()
        const accountInfo = await User.findOne({ userId: verifiedToken.id })
        if (!accountInfo) return createResponse(400, { message: "user_not_found" })

        const update = {}
        if (name) update.userName = name
        if (img) update.userImg = img
        if (role) update.userRole = role
        if (password) {
            const salt = crypto.randomBytes(64).toString('base64')
            const hashedPassword = crypto.pbkdf2Sync(password, salt, 8, 64, 'sha512').toString('base64')
            update.userPassword = hashedPassword
            update.userPasswordSalt = salt
        }

        const user = await User.findOneAndUpdate({ id: verifiedToken.id }, update, { new: true })
        return createResponse(200, { "message": "account_patched", user })

    } catch (err) {
        return createResponse(500, err)
    }

}

exports.readStory = async (event) => {
    try {
        await connect()
        const story = await Story.findById(event.pathParameters.id).exec()
        if (!story) return { statusCode: 404 }
        return createResponse(200, story)
    } catch (err) {
        return createResponse(500, { error: err })
    }
}

exports.updateStory = async (event) => {
    const update = JSON.parse(event.body)
    await connect()
    const story = await Story.findOneAndUpdate({ _id: event.pathParameters.id }, update, { new: true }).exec()
    if (!story) return { statusCode: 404 }
    return createResponse(200, story)
}

exports.deleteStory = async (event) => {
    await connect()
    await Story.remove({ _id: event.pathParameters.id }).exec()
    return createResponse(204, null)
}