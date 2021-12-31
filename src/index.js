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

exports.helloWorld = async (event) => {
    return createResponse(200, { message: "hello, hyuns API!" })
}