const mongoose = require("mongoose")

// User 스키마
const UserSchema = new mongoose.Schema({
    userId: String,
    userPassword: String,
    userPasswordSalt: String,
    userRole: String,
    userName: String,
    userImg: String
})
global.User = global.User || mongoose.model('User', UserSchema);
module.exports.User = global.User;

// Var 스키마
const VarSchema = new mongoose.Schema({
    varGroup: String,
    varKey: String,
    varValue: String,
    varIsSecret: Boolean,
    varImg: String,
    varAuthor: String
})
global.Var = global.Var || mongoose.model('Var', VarSchema);
module.exports.Var = global.Var;

// Server 스키마
const ServerSchema = new mongoose.Schema({
    svName: String,
    svId: String,
    svAddress: String,
    svCheckURL: String,
    svImg: String,
    svMemo: String,
    svLastCheckStatus: String,
    svLastCheck: Date,
    svAuthor: String,
    svApiKey: String
})
global.Server = global.Server || mongoose.model('Server', ServerSchema);
module.exports.Server = global.Server;

// Resource 스키마
const ResourceSchema = new mongoose.Schema({
    rsName: String,
    rsPath: String,
    rsMemo: String,
    rsAuthor: String
})
global.Resource = global.Resource || mongoose.model('Resource', ResourceSchema);
module.exports.Resource = global.Resource;

// Message 스키마
const MessageSchema = new mongoose.Schema({
    msgContent: String,
    msgAuthorId: String,
    msgCreated: { type: Date, required: true, default: () => Date.now() },
    msgLevel: String
})
global.Message = global.Message || mongoose.model('Message', MessageSchema);
module.exports.Message = global.Message;