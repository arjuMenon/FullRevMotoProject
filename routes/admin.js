var express = require('express');
var router = express.Router();
var adminHelpers = require('../helpers/admin-helpers');
const productHelpers = require('../helpers/product-helpers');
var fileUpload= require('express-fileupload');
const { route } = require('./admin');
const { reject } = require('promise');
const userHelpers = require('../helpers/user-helpers');
// const { default: orders } = require('razorpay/dist/types/orders');
const verifyLogin=((req,res,next)=>{
  if(req.session.adminLoggedIn){
    next()
    }else{
      res.redirect('/admin/login')
    }

})



/* Admin Page. */
router.get('/',verifyLogin,(req, res) => {
  
  let admin = req.session.admin;
  if(admin){
  // console.log('cookie', admin);  // Logs the admin session info to the console
  res.render('admin/dashboard', { admin });
  }  // Passes admin as an object
});

  // res.send({success : true, msg : "welcome to dashboard"});



router.get('/login', function(req, res, next) {
  res.render('admin/login',{ isLoginPage: false });
  
});



router.post('/login', (req, res) => {
  // console.log(req.body)
  adminHelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      // Successful login
      
      req.session.adminLoggedIn=true
      req.session.admin=response.admin

      res.redirect('/admin');
    } else {
      // Failed login, render login page with error message
      res.render('admin/login', { error: response.err });
    }
  })
  .catch((err) => {
    console.error(err);
    res.render('admin/login', { error: 'Something went wrong. Please try again.' });
  });
});
router.get('/logout',(req,res)=>{
  req.session.destroy()
  res.redirect('/admin/login')
})


router.get('/products',verifyLogin,(req,res)=>{
  let admin=req.session.admin
  if(admin){  
  productHelpers.getAllProducts().then((products)=>{
    // console.log('product',products)

    res.render('admin/products',{products,admin})
  })
}
})


router.get('/add-Products',verifyLogin,(req,res)=>{
  let admin=req.session.admin
  if(admin){
   res.render('admin/add-products',{admin})
  }
  
})
router.post('/add-products',(req,res)=>{
  // console.log('body',req.body)
  // console.log('image',req.files.Image)
  let image=req.files.Image
  productHelpers.addProduct(req.body).then((id)=>{
    // console.log('id',id)
    image.mv('./public/product-images/'+id+'.jpg'),(err,done)=>{
      if(!err){
        res.redirect('/admin/products')}
        else{
          console.log(err);
        }
      }

  
  })
})
 router.get('/edit-products/:id',verifyLogin,(req,res)=>{
    // console.log('ID',req.params.id)

    productHelpers.getProduct(req.params.id).then((product)=>{
      // console.log('product',product)

      res.render('admin/edit-products',{product})
    })
  })
  router.post('/edit-products/:id',(req,res)=>{
    // console.log('body',req.body)
    // console.log('id',req.params.id)
    productHelpers.updateProduct(req.params.id,req.body).then((product)=>{
      res.redirect('/admin/products')

    })
  })
  router.get('/delete-product/:id',(req,res)=>{
    console.log('id',req.params.id)
    productHelpers.deleteProduct(req.params.id).then(()=>{
      res.redirect('/admin/products')
    })
  })
  router.get('/allUsers',verifyLogin,(req,res)=>{
    let admin=req.session.admin
    if(admin){
    adminHelpers.getAllUsers().then((users)=>{

      res.render('admin/allUsers',{users,admin})
    })
  }
  })
  router.get('/delete-user/:id',(req,res)=>{
    adminHelpers.deleteUser(req.params.id).then(()=>{
      res.redirect('/admin/allUsers')
    })
  })
  router.get('/block-user/:id',(req,res)=>{
    adminHelpers.blockUser(req.params.id).then(()=>{
      res.redirect('/admin/allUsers')
    })
  })
  router.get('/allOrders',verifyLogin,async(req,res)=>{
    let admin=req.session.admin
    if(admin){
    await adminHelpers.getAllOrders().then((orders)=>{
      res.render('admin/allOrders',{orders,admin})

    })
  }
  })
  router.get('/cancel-order/:id',(req,res)=>{
    console.log('id',req.params.id)
    adminHelpers.cancelOrder(req.params.id).then((response)=>{
      res.redirect('/admin/allOrders')

    })
  })
  router.get('/delivered/:id',(req,res)=>{
    adminHelpers.delivered(req.params.id).then(()=>{
      res.redirect('/admin/allOrders')
    })
  })



module.exports = router;
