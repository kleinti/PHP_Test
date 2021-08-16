const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Group = require('../models/Group');
const authService  = require('../services/authService');


const checkUser = async (req) => {
    const token = req.cookies.jwt;
    if (token) {
        const user = jwt.verify(token, 'SECRET! To be updated for production', async (err, decodedToken) => {
            if (err) {
                console.log('Error wehen decoding token: ', err)
                return null;
            } else {
                let user = await User.findById(decodedToken.id);
                // console.log(user)
                return user; 
            }
        });
        return user;
    } 
    else {
        console.log('No java web token in request header. User not logged in?')
        return null
    }
}

// Method: Check from which user the request is coming
const getRequesterInfo = async (req) => {
	
	let userId = null;
	let user = null;
	let groupId = null;
	let group = null;

    try {        
        user = await checkUser(req);   
        
        if (user) {
            userId = user._id;
            if ('groupID' in req.cookies) {
                try {
                    groupId = req.cookies.groupID;					
                    group = await Group.findById(groupId);
                    if (group.members.indexOf(userId) === -1){   // check if user from token is member of group
                        console.log('Requesting user is not in group indicated by group cookie');
                        groupId = null;
                        group = null;
                    }
                }
                catch (err) {
                    console.log('Error when executing module.exports.requesterInfo:', err);
                    groupId = null;
                    group = null;
                }
            }
        }   
    }       
    catch (err) {
        console.log('Error when executing module.exports.requesterInfo:', err);
        userId = null;
        user = null;
        groupId = null;
        group = null;
    }


	return {userId, user, groupId, group};
}



module.exports = { checkUser , getRequesterInfo};