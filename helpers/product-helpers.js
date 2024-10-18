var db = require('../config/connection')
const collection= require('../config/collections')
const { resolve, reject } = require('promise')
var objectId = require('mongodb').ObjectId


module.exports={

getAllProducts:()=>{
    return new Promise (async(resolve,reject)=>{
        let products =await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
        // console.log('products',products)
        resolve(products)



    })

},
addProduct:(products)=>{
    return new Promise(async(resolve,reject)=>{
        await db.get().collection(collection.PRODUCT_COLLECTION).insertOne(products);
        // console.log('data',products)
        resolve(products)

    })

},
getProduct:(proId)=>{
    // console.log('proId',proId)
    return new Promise((resolve,reject)=>{
        db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:objectId(proId)}).then((response)=>{
            resolve(response)
        })
    })

},
updateProduct:(proId,details)=>{
    return new Promise((resolve,reject)=>{
        product=db.get().collection(collection.PRODUCT_COLLECTION).updateOne({_id:objectId(proId)},
    {
        $set:
        {
            Name:details.Name,
            Price:details.Price,
            About:details.About,
            Brand:details.Brand,
            Image:details.Image

        }
    }).then((product)=>{
        resolve(product)

    })

    })

},
deleteProduct:(proId)=>{
    return new Promise((resolve,reject)=>{
        db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({_id:objectId(proId)}).then(()=>{
            resolve()
        })
    })
}

}