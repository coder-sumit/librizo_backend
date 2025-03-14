function successBody(message, data){
    return {
        res: {
            code: 200,
            status: "success"
        },
        success: true,
        message,
        data,
        
    }
}

module.exports = successBody;