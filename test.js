const crypto = require('crypto');

const password = "123456"


const salts = crypto.randomBytes(64).toString('base64')
const hashedPassword = crypto.pbkdf2Sync(password, salts, 8, 64, 'sha512').toString('base64')
console.log(salts, hashedPassword)
