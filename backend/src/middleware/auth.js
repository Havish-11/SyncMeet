import jwt from 'jsonwebtoken';

export const signToken = (user) => // create a key for a user which expires in 7 days
    jwt.sign({id: String(user._id), name:user.name}, process.env.JWT_SECRET, {expiresIn: '7d'});

export const verifyToken = (token) =>{ //verification of the token
    const {id,name} = jwt.verify(token,process.env.JWT_SECRET);
    return {id,name};
};

export function requireAuth(req,res,next){ // authorization middleware
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ')? header.slice(7):null;
    try{
        req.user = verifyToken(token);
        next();
    }catch{
        res.status(401).json({error: 'Unauthorized'});
    }
}