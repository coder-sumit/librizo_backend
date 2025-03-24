function successBody(message, data){
    return {
        success: true,
        message,
        data,
        
    }
}

module.exports = successBody;