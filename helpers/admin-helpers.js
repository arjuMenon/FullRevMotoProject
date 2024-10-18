var db = require('../config/connection')
const collection= require('../config/collections')
const { getAllProducts } = require('./product-helpers')
const { resolve, reject } = require('promise')
var objectId = require('mongodb').ObjectId


module.exports={

    doLogin:(userData)=>{
        return new Promise(async(resolve,reject)=>{
            loggedIn=false
            let response={}
            let admin=await db.get().collection(collection.ADMIN_COLLECTION).findOne({
            Email:userData.email,
            Password:userData.password})
            if(admin){
                console.log('login successfuly')
                response.admin=admin
                response.status=true
                resolve(response)
            } else {
                console.log('Login failed');
                response.status = false;
                response.err = "Email & password doesn't match";  // Add error message
                resolve(response);  // Failed login
            }
        })
    },
    getAllUsers:()=>{
        return new Promise(async(resolve,reject)=>{
            let users=await db.get().collection(collection.USER_COLLECTION).find().toArray()
            resolve(users)
        })

    },
    deleteUser:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            await db.get().collection(collection.USER_COLLECTION).deleteOne({_id:objectId(userId)}).then(()=>{
                resolve()
            })
        })
    },
    blockUser:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            await db.get().collection(collection.USER_COLLECTION).updateOne({_id:objectId(userId)},
        {
            $set:
            {
                blocked:true

            }
        }).then(()=>{
            resolve()
        })

        })
    },
    getAllOrders:()=>{
        return new Promise(async(resolve,reject)=>{
           let orders= await db.get().collection(collection.ORDER_COLLECTION).find().toArray()
           resolve(orders)

        })
    },
    cancelOrder:(userId)=>{
        console.log('userId',userId)
        return new Promise(async(resolve,reject)=>{
            await db.get().collection(collection.ORDER_COLLECTION).deleteOne({User:objectId(userId),Status:'pending'}

        ).then((response)=>{
            resolve(response)
        })
        
        })

    },
    delivered:(orderId)=>{
        return new Promise(async(resolve,reject)=>{
            await db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:objectId(orderId),Status:'placed'},
        {
            $set:{Status:'Delivered'}
        }).then((response)=>{
            resolve(response)

        })
        })

    }

}
