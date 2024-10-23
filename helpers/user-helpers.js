var db = require('../config/connection')
const collection = require('../config/collections')
const bcrypt = require('bcrypt')
const { reject, resolve } = require('promise')
var objectId = require('mongodb').ObjectId
const Razorpay = require('razorpay')
const { registerHelper } = require('hbs')
// const { default: products } = require('razorpay/dist/types/products')
// const { default: orders } = require('razorpay/dist/types/orders')
var instance = new Razorpay({
    key_id: 'rzp_test_ZWBb64aF6vvl05',
    key_secret: 'Jf9Bv7M8hDPoX3Cj0wVj2qKZ',
});

module.exports = {
 
    doSignup: (userData) => {
        return new Promise(async (resolve, reject) => {
            if (userData.password !== userData.confirmPassword) {
                reject({ message: "Passwords do not match" });
                return;
            }
            userData.password = await bcrypt.hash(userData.password, 10);
            db.get().collection(collection.USER_COLLECTION).insertOne({
                Email: userData.email,
                Username: userData.username,
                Password: userData.password
            }).then((data) => {
                resolve(data.ops[0]);
            }).catch(err => reject(err));
        });
    },

    dologin: (userData) => {
        return new Promise(async (resolve, reject) => {
            loggedIn = false
            let response = {}

            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: userData.email })
            if (user.blocked) {
                response.status = false
                response.err = "User is blocked"
                resolve(response)
            }

            if (user) {
                bcrypt.compare(userData.password, user.Password).then((status) => {
                    if (status) {
                        console.log('Login successful')
                        response.user = user
                        response.status = true
                        resolve(response)

                    } else {
                        console.log('Login Failed')
                        response.status = false
                        response.err = "Email & password doesn't match";  // Add error message
                        resolve(response);

                    }

                })

            } else {
                console.log('Login Failed')
                response.status = false
                response.err = "Email dosn't exist";  // Add error message
                resolve(response);

            }
        })

    },

    doSearch: (userData) => {


        return new Promise(async (req, res) => {
            let response = {}
            let data = await db.get().collection(collection.PRODUCT_COLLECTION).find({
                Name: userData.value
            })
            resolve(response)
        })
    },
    addToCart: (proId, userId) => {
        let proObj = {
            item: objectId(proId),
            quantity: 1
        }


        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (userCart) {
                let proExist = userCart.products.findIndex(product => product.item == proId)
                // console.log('proExist',proExist)
                if (proExist != -1) {
                    db.get().collection(collection.CART_COLLECTION).updateOne({ user: objectId(userId), 'products.item': objectId(proId) },

                        {
                            $inc: { 'products.$.quantity': 1 }
                        }

                    ).then(() => {
                        resolve()
                    })
                    // paste
                    await db.get().collection(collection.WISHLIST_COLLECTION).updateOne({user:objectId(userId)},
                    {
                        $pull:
                        {
                            products:objectId(proId)
                        }
                    }).then((response)=>{
                        resolve(response)
            
                    })

                } else {
                    db.get().collection(collection.CART_COLLECTION).updateOne(
                        {
                            user: objectId(userId),
                        },
                        {
                            $push: { products: proObj }
                        }).then((response) => {
                            resolve()

                        })
                        // paste
                        await db.get().collection(collection.WISHLIST_COLLECTION).updateOne({user:objectId(userId)},
                        {
                            $pull:
                            {
                                products:objectId(proId)
                            }
                        }).then((response)=>{
                            resolve(response)
                
                        })
                }

            } else {
                db.get().collection(collection.CART_COLLECTION).insertOne(

                    {
                        user: objectId(userId),
                        products: [proObj]

                    }).then((response) => {

                        resolve()
                    })
                      await db.get().collection(collection.WISHLIST_COLLECTION).updateOne({user:objectId(userId)},
        {
            $pull:
            {
                products:objectId(proId)
            }
        }).then((response)=>{
            resolve(response)

        })
        // paste
        await db.get().collection(collection.WISHLIST_COLLECTION).updateOne({user:objectId(userId)},
        {
            $pull:
            {
                products:objectId(proId)
            }
        }).then((response)=>{
            resolve(response)

        })
            }
        })

    },
    addCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$products'

                },
                {
                    $project:
                    {
                        item: '$products.item',
                        quantity: '$products.quantity'

                    }

                },
                {
                    $lookup:
                    {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'

                    }



                },
                {
                    $project:
                    {
                        item: 1,
                        quantity: 1,
                        product: { $arrayElemAt: ['$product', 0] }

                    }

                }


            ]).toArray()
            // console.log('items',cartItems[0].product)
            resolve(cartItems)


        })
    },
    addCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            try {
                let count = 0;
                // Find the user's cart
                let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) });

                // Check if a cart exists for the user
                if (cart && cart.products) {
                    count = cart.products.length; // Count the number of products
                }

                resolve(count);
            } catch (error) {
                reject(error); // Reject the promise in case of an error
            }
        });
    },
    changeProductQuantity: (details) => {
        count = parseInt(details.count);
        details.quantity = parseInt(details.quantity);

        return new Promise(async (resolve, reject) => {
            try {
                // If the count is -1 and the current quantity is 1, remove the product
                if (count === -1 && details.quantity === 1) {
                    await db.get().collection(collection.CART_COLLECTION).updateOne(
                        { _id: objectId(details.cart) },
                        {
                            $pull: {
                                products: { item: objectId(details.product) }
                            }
                        }
                    ).then((response) => {
                        resolve({ removeProduct: true });
                    });
                } else {
                    // Otherwise, update the product quantity
                    await db.get().collection(collection.CART_COLLECTION).updateOne(
                        { _id: objectId(details.cart), 'products.item': objectId(details.product) },
                        {
                            $inc: { 'products.$.quantity': count }
                        }
                    ).then((response) => {
                        resolve(response);
                    });
                }
            } catch (err) {
                reject(err); // Catch and handle any errors
            }
        });
    },


    removeProduct: (cartId, proId) => {
        console.log('rProducts', cartId, proId);

        return new Promise(async (resolve, reject) => {
            await db.get().collection(collection.CART_COLLECTION).updateOne(
                { _id: objectId(cartId) },
                {
                    $pull: {
                        products: { item: objectId(proId) }  // Remove entire product object where item matches proId
                    }
                }
            ).then(() => {
                resolve();
            }).catch((error) => {
                reject(error);
            });
        });
    },
    addToWishlist: (proId, userId) => {
        console.log('data', proId, userId)
        return new Promise(async (resolve, reject) => {
            let wishlist = await db.get().collection(collection.WISHLIST_COLLECTION).findOne({ user: objectId(userId) })
            if (wishlist) {
                db.get().collection(collection.WISHLIST_COLLECTION).updateOne({ user: objectId(userId) },
                    {
                        $push:
                        {
                            products: objectId(proId)
                        }
                    }).then((response) => {
                        resolve()

                    })

            } else {
                db.get().collection(collection.WISHLIST_COLLECTION).insertOne({
                    user: objectId(userId),
                    products: [objectId(proId)],
                    isActive: true
                }).then((response) => {
                    resolve(response)
                    console.log('response', response)

                })
            }
        })

    },
    getWishlist: (userId) => {
        return new Promise(async (resolve, reject) => {
            let wishlist = await db.get().collection(collection.WISHLIST_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }

                },
                {
                    $lookup:
                    {
                        from: collection.PRODUCT_COLLECTION,
                        let: { prodList: '$products' },
                        pipeline:
                            [
                                {
                                    $match:
                                    {
                                        $expr:
                                        {
                                            $in: ['$_id', '$$prodList']
                                        }

                                    }
                                }

                            ],
                        as: 'wishlistItems'
                    }
                }
            ]).toArray()
            console.log(wishlist[0].wishlistItems)
            resolve(wishlist[0].wishlistItems)

        })

    },
    saveInfo: (info, userId) => {

        return new Promise((resolve, reject) => {
            let response = {}
            if (!info.firstName || !info.lastName || !info.address || !info.phoneNumber) {
                response.info = false
                response.err = 'All fields are required'
                resolve(response)

            } else {
                response.info = true




                db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userId) },

                    {
                        $set: {
                            FirstName: info.firstName,
                            LastName: info.lastName,
                            Address: info.address,
                            PhoneNumber: info.phoneNumber
                        }


                    }).then((response) => {
                        resolve(response)
                    })

            }
        })

    },
    getInfo: (userId) => {
        return new Promise(async (resolve, reject) => {
            await db.get().collection(collection.USER_COLLECTION).findOne({ _id: objectId(userId) }).then((response) => {
                resolve(response)
            })
        })

    },
    changePassword: (psswd, userId) => {



        return new Promise(async (resolve, reject) => {
            let response = {};

            try {
                // Check if the new password and confirm password match
                if (psswd.newPass !== psswd.confNewPass) {
                    response.status = false;
                    response.err = "New password and confirm password do not match.";
                    return reject(response);  // Reject promise with error message
                }

                // Check if the new password is the same as the old password
                if (psswd.newPass === psswd.oldPass) {
                    response.status = false;
                    response.err = "New password cannot be the same as the old password.";
                    return reject(response);  // Reject promise with error message
                }

                // Fetch user data from the database
                let user = await db.get().collection(collection.USER_COLLECTION).findOne({ _id: objectId(userId) });




                // Compare old password with the stored password
                const passwordMatch = await bcrypt.compare(psswd.oldPass, user.Password);
                if (!passwordMatch) {
                    response.status = false;
                    response.err = "Old password is incorrect.";
                    return reject(response);  // Reject promise if old password is incorrect
                }

                // Hash the new password before updating it in the database
                const hashedNewPassword = await bcrypt.hash(psswd.newPass, 10);

                // Update the password in the database
                await db.get().collection(collection.USER_COLLECTION).updateOne(
                    { _id: objectId(userId) },
                    { $set: { Password: hashedNewPassword } }
                );

                // Password update successful
                response.status = true;
                response.ok = "Password changed successfully.";
                resolve(response);  // Resolve promise with success message

            } catch (error) {
                // Catch any unexpected errors
                response.status = false;
                response.err = "An error occurred during the password change process.";
                reject(response);  // Reject promise with generic error message
            }
        });

    },
   
    
    totalPrice: (userId) => {
        console.log('Id', userId)
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$products'

                },
                {
                    $project:
                    {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup:
                    {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project:
                    {
                        item: 1,
                        quantity: 1,
                        product: { $arrayElemAt: ['$product', 0] }


                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $multiply: ['$quantity', { $toInt: '$product.Price' }] } }
                    }

                }

            ]).toArray()
            // console.log('total',total)
            resolve(total[0].total)
        })
    },
    placeOrder: (order, products, total) => {
        return new Promise(async (resolve, reject) => {
            try {
                let status = order['payment-method'] === 'COD' ? 'placed' : 'pending';
                let orderObj = {
                    deliveryDetails: {
                        Mobile: order.mobile,
                        Address: order.address,
                        Pincode: order.pincode
                    },
                    Products: products,
                    User: objectId(order.userId),
                    TotalAmount: total,
                    Date: new Date(),
                    PaymentMethod: order['payment-method'],
                    Status: status
                };
                
                const response = await db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj);
                await db.get().collection(collection.CART_COLLECTION).deleteOne({ user: objectId(order.userId) });
                resolve(response.insertedId);
                
            } catch (error) {
                console.error('Error in placeOrder helper:', error);
                reject('Failed to place order');
            }
        });
    },
    
  

    getCartProductList: (userId) => {
        console.log('userId', userId)
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })



            resolve(cart.products)
            console.log('product', cart.products)
        })
    },
   
    

    // getOrders: (userId) => {
    //     return new Promise(async (resolve, reject) => {
    //         try {
    //             // Retrieve all orders for the specified user and convert to an array
    //             const orders = await db.get().collection(collection.ORDER_COLLECTION).find({ User: objectId(userId) }).toArray();
    //             console.log("Fetched orders:", orders);  // Check the fetched orders for debugging
    //             resolve(orders);
    //         } catch (error) {
    //             console.error("Error fetching orders:", error);
    //             reject(error);
    //         }
    //     });
    // },
    
    getProductDetails: (userId) => {
        return new Promise(async (resolve, reject) => {
            let orderItems = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { User: objectId(userId) }
                },
                {
                    $unwind: '$Products'

                },
                {
                    $project:
                    {
                        item: '$Products.item',
                        quantity: '$Products.quantity',     
                        Status:'$Status',
                        Date:'$Date',
                        PaymentMethod:'$PaymentMethod'



                    }

                },
                {
                    $lookup:
                    {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'

                    }



                },
                {
                    $project:
                    {
                        item: 1,
                        quantity: 1,
                        product: { $arrayElemAt: ['$product', 0] },
                        Status:1,
                        Date:1,
                        PaymentMethod:1

                    }

                }


            ]).toArray()
            // console.log('items', orderItems[0].product)
            console.log('order', orderItems)
            resolve(orderItems)


        })
    },
    generateRazorpay: (orderId,total) => {
        console.log('total',total)
      return new Promise((resolve,reject)=>{
        var options = {
            amount : total * 100,
            currency:"INR",
            receipt:orderId
        };
        instance.orders.create(options,function(err,order){
            console.log('orders',order);
            resolve(order)
        })
      })
    },
    verifyPayment:(details)=>{
        return new Promise((resolve,reject)=>{
            const crypto =require('crypto');
            let hmac=crypto.createHmac('sha256','Jf9Bv7M8hDPoX3Cj0wVj2qKZ')
            hmac.update(details.payment.    razorpay_order_id+'|'+details.payment.razorpay_payment_id);
            hmac=hmac.digest('hex')
            if(hmac==details.payment. razorpay_signature){
                resolve()
            }else{
                reject()
            }
        })

    },
    changeStatus:(orderId)=>{
        console.log('details',orderId)
        return new Promise(async(resolve,reject)=>{
            
                await db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:objectId(orderId)},
            {
                $set:{Status:'placed'}
            }).then((response)=>{
                resolve(response)
            })

            

        })
    },
    forgotPassword:(data)=>{
        let response={}
        return new Promise(async(resolve,reject)=>{
           let check= await db.get().collection(collection.USER_COLLECTION).findOne({Email:data.email,Username:data.username}
                
                
            )
            if(check){
                response.status=true
                resolve(response)
            }else{
                response.err="The email and username don't match"
                resolve(response)

            }
        })
    },
    change_Password: (data) => {
        let response = {};
        return new Promise(async (resolve, reject) => {
          // Check if the passwords match
          if (data.newPass !== data.confNewPass) {
            response.status = false;
            response.err = "New password and confirm password do not match.";
            return resolve(response);  // Resolve the promise with the error message
          }
          
          // Hash the new password
          data.newPass = await bcrypt.hash(data.newPass, 10);
          
          // Update the password in the database
          await db.get().collection(collection.USER_COLLECTION).updateOne({ Email: data.email }, {
            $set: { Password: data.newPass }
          }).then(() => {
            response.status = true;
            response.msg = "Password changed successfully!";
            resolve(response);  // Successfully changed password
          }).catch((error) => {
            response.status = false;
            response.err = "Error updating password. Please try again.";
            reject(response);  // Handle database errors
          });
        });
      },
      removeFromWishlist:(proId,userId)=>{
        return new Promise(async(resolve,reject)=>{
            await db.get().collection(collection.WISHLIST_COLLECTION).updateOne({user:objectId(userId)},
        {
            $pull:
            {
                products:objectId(proId)

            }
        }).then((response)=>{
            resolve(response)
        })
        })
      }
      





    // changePassword:(psswd,userId)=>{
    //     // console.log('psswd',psswd,userId)
    //     let response={}
    //     return new Promise(async(resolve,reject)=>{
    //         let user=await db.get().collection(collection.USER_COLLECTION).findOne({_id:objectId(userId)})
    //         bcrypt.compare(psswd.password, user.Password).then((status) => {
    //             if(!status){
    //                 response.status=false
    //                 response.err="Old password is incorrect."
    //                 resolve(response)
    //             }
    //             if(psswd.password === user.Password){
    //                 response.status=false
    //                 response.err="New password cannot be the same as the old password."
    //             }

    //         })
    //         bcrypt.hash(psswd.newPass, 10).then((hashedPassword)=>{
    //             db.get().collection(collection.USER_COLLECTION).updateOne({_id:objectId(userId)},
    //         {
    //             $set:
    //             {
    //                 Password:hashedPassword
    //             }
    //         }).then(()=>{
    //             console.log('passwd',hashedPassword)
    //             response.status=true
    //             response.ok="Password changed successfully"
    //             resolve(response)
    //         }).catch((error)=>{
    //             response.status=false
    //             response.err="Failed to change password"
    //             resolve(response)

    //         })



    //         })
    //     })
    // }



    //     doWishlist:(proId,userId)=>{

    //         console.log('proId',proId,userId)
    //         return new Promise(async(resolve,reject)=>{

    //             db.get().collection(collection.WISHLIST_COLLECTION).insertOne(

    //                 {
    //                     user: objectId(userId),
    //                     products: [proId]

    //                 }).then((response) => {

    //                     resolve()
    //                 })
    //         })
    //     }
    // }

    // removeProduct:(cartId,proId)=>{
    //     console.log('rProducts',cartId,proId)

    //     return new Promise(async(resolve,reject)=>{
    //        await db.get().collection(collection.CART_COLLECTION).updateOne({_id:objectId(cartId),'products.item':objectId(proId)},
    //     {
    //         $pull:
    //         {
    //             'products.$.item':objectId(proId)


    //         }
    //     }).then(()=>{
    //         resolve()
    //     })
    //     })

    // }


    // 





}




