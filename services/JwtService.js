const {JWT_SECRET, DEBUG_MODE} = require("../config");
const jwt = require("jsonwebtoken");

const expiry_default = DEBUG_MODE === "true"?'86400s':'30s';


class JwtService {
    static sign(payload, expiry=expiry_default, secret=JWT_SECRET){
        return jwt.sign(payload, secret, {expiresIn: expiry});
    }
     
    static verify(token,secret=JWT_SECRET){
        return jwt.verify(token, secret);
    }
}

module.exports = JwtService;