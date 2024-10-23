var express = require('express');
const productHelpers = require('../helpers/product-helpers');
var router = express.Router();
const userHelpers = require('../helpers/user-helpers');
const adminHelpers = require('../helpers/admin-helpers');

const verifyLogin = ((req, res, next) => {
  if (req.session.userLoggedIn) {
    next()
  } else {
    res.redirect('/login')
  }

})

/* GET users listing. */
router.get('/', async function (req, res, next) {
  let user = req.session.user;
  //            console.log("user", user);

  try {
    // Fetch all products
    let products = await productHelpers.getAllProducts();

    // If the user is logged in, fetch the cart count
    let count = 0 // Default count to 0 if the user is not logged in
    if (user) {
      count = await userHelpers.addCount(user._id);
    }

    // Render the page with both products and cart count (if available)
    res.render('users/home', {
      products,
      user,
      count,
      // isLoginPage: true
    });

  } catch (error) {
    // Handle errors (e.g., database issues)
    next(error);
  }
});


router.get('/signup', (req, res) => {
  res.render("users/signup")
})

router.post('/signup', (req, res) => {
  userHelpers.doSignup(req.body).then((response) => {

    console.log("userData", (response))
    res.redirect('/login')
  })
})
router.get('/forgot-Password', (req, res) => {
  res.render("users/forgotPassword")

})
router.post('/forgot-password', (req, res) => {
  // console.log('body',req.body)
  userHelpers.forgotPassword(req.body).then((response) => {
    if(response.status){
      res.render('users/changePassword')
    }else{
      error=response.err
      res.render('users/forgotPassword',{error})
    }

  })

})
router.get('/change-password',(req,res)=>{
  res.render('users/changePassword')
})
router.post('/change-password',(req,res)=>{
  userHelpers.change_Password(req.body).then((response)=>{
    if(response.status){
   
      res.render("users/changePassword",{msg:response.msg})

    }else{
      res.render('users/changePassword',{err:response.err})

    }

  }).catch((response) => {
    res.render('users/changePassword', { err: response.err });  // Error message on rejection
  });
})
router.get('/login', (req, res) => {
  if (req.session.userLoggedIn) {
    res.redirect('/')
  } else {
    res.render('users/login', { error: req.session.loginError });
    req.session.loginError = null;
  }  // Clear error after rendering
});
router.get('/logout', (req, res) => {
  req.session.destroy()
  res.redirect('/login')
})


router.post('/login', (req, res) => {
  userHelpers.dologin(req.body).then((response) => {
    if (response.status === true) {  // Corrected comparison
      req.session.user = response.user;
      req.session.userLoggedIn = true;
      res.redirect('/');
    } else {
      req.session.loginError = response.err;  // Storing error message in session
      res.redirect('/login');
    }
  });
});

router.post('/', (req, res) => {
  userHelpers.doSearch(req.body).then((searchProduct) => {
    res.render('users/search', { searchProduct })

  })
})
router.get('/cart', verifyLogin, async (req, res) => {
  let user = req.session.user._id
  let count = 0 // Default count to 0 if the user is not logged in
  if (user) {
    count = await userHelpers.addCount(user);
  }
  if (count === 0) {
    res.render('users/empty')
  } else {

    // console.log("count",count)
    let totalValue = await userHelpers.totalPrice(req.session.user._id)
    await userHelpers.addCartProducts(req.session.user._id).then((product) => {
      // console.log('cartItems',product)

      res.render('users/cart', { count, product, totalValue })
    })
  }
})
router.get('/add-to-cart/:id', verifyLogin, (req, res) => {
  console.log(`inside cart api`)
  // console.log('ID',req.params)
  userHelpers.addToCart(req.params.id, req.session.user._id).then(() => {
    res.redirect('/cart')

  })
})
router.post('/change-product-quantity', async (req, res) => {
  console.log('body', req.body)

  await userHelpers.changeProductQuantity(req.body).then(async (response) => {
    response.total = await userHelpers.totalPrice(req.session.user._id)

    res.json(response)



  })
})
router.post('/remove-product', (req, res) => {
  console.log('body', req.body);  // Log to verify data sent from the frontend
  const { cart, product } = req.body;  // Destructure the cart and product IDs from req.body

  userHelpers.removeProduct(cart, product).then(() => {
    res.json({ success: true });  // Send success response to the client
  }).catch((err) => {
    res.status(500).json({ error: err.message });  // Handle errors
  });
});

router.get('/wishlist', verifyLogin, (req, res) => {
  userHelpers.getWishlist(req.session.user._id).then((products) => {
    console.log('products', products)

    res.render('users/wishlist', { products })
  })
})

router.get('/add-to-wishlist/:id', verifyLogin, (req, res) => {
  userHelpers.addToWishlist(req.params.id, req.session.user._id).then(() => {
    res.redirect('/wishlist')

  })

})
router.get('/remove-from-wishlist/:id',verifyLogin,(req,res)=>{
  console.log('proId',req.params.id,'userId',req.session.user._id)
  userHelpers.removeFromWishlist(req.params.id,req.session.user._id).then((response)=>{
    res.redirect("/wishlist")
  })
})
router.get('/profile', verifyLogin, (req, res) => {
  userHelpers.getInfo(req.session.user._id).then((response) => {
    res.render('users/profile', { response })
  })
})
router.post('/saveInfo', (req, res) => {
  // if(response.info){
  userHelpers.saveInfo(req.body, req.session.user._id).then((response) => {
    if (response.info) {
      res.redirect('/profile')
    } else {
      error = response.err
      res.render('users/profile', { error })

    }
  })

})
router.post('/changePassword', verifyLogin, (req, res) => {
  console.log('body', req.body)
  userHelpers.changePassword(req.body, req.session.user._id).then((response) => {
    if (response.status) {
      res.render('users/profile', { ok: response.ok });  // Success message
    } else {
      res.render('users/profile', { err: response.err });  // Error message
    }
  }).catch((response) => {
    res.render('users/profile', { err: response.err });  // Error message on rejection
  });
})
router.get('/place-order', verifyLogin, (req, res) => {
  userHelpers.totalPrice(req.session.user._id).then((total) => {
    res.render('users/placeOrder', { total, user: req.session.user._id })
  })
})
router.post('/place-order', verifyLogin, async (req, res) => {
  try {
    const { userId, 'payment-method': paymentMethod } = req.body;

    // Ensure userId and paymentMethod exist in the request
    if (!userId || !paymentMethod) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const products = await userHelpers.getCartProductList(userId);
    const totalValue = await userHelpers.totalPrice(userId);

    // Place the order
    const orderId = await userHelpers.placeOrder(req.body, products, totalValue);

    // Handle response based on payment method
    if (paymentMethod === 'COD') {
      res.json({ codSuccess: true });
    } else {
      const razorpayResponse = await userHelpers.generateRazorpay(orderId, totalValue);
      res.json(razorpayResponse);
    }

  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ error: 'Failed to place order' });
  }
});


router.get('/orderSuccess', (req, res) => {
  res.render('users/orderSuccess')
})
router.get('/orders', verifyLogin, async (req, res) => {
  // console.log('id',user._id)
  let user = req.session.user
  // let orders=await userHelpers.getOrders(user._id)
  let product = await userHelpers.getProductDetails(user._id)
  // console.log('user',user)
  console.log('product', product)
  // console.log('23orders',orders)

  res.render('users/orders', { product, user })


})
router.post('/verify-payment', verifyLogin, (req, res) => {
  // console.log('order',req.body)
  userHelpers.verifyPayment(req.body).then((response) => {

    userHelpers.changeStatus(req.body.order.receipt)
    res.json({ status: true })
  }).catch((err) => {
    res.json({ status: false })
  })
})

router.get('/photos', (req, res) => {
  res.render('users/photos')
})
router.get('/privacy-policy', (req, res) => {
  res.render('users/privacy')
})
router.get('/terms-conditions', (req, res) => {
  res.render('users/terms')
})
router.get('/returns', (req, res) => {
  res.render('users/return')
})
router.get('/cancellation', (req, res) => {
  res.render('users/cancellation')
})
router.get('/shipping-policy', (req, res) => {
  res.render("users/shippingPolicy")
})
// router.get('/orders',verifyLogin,(req,res)=>{
//   userHelpers.getOrders(req.session.user._id).then((orders)=>{
//     console.log('orders',orders)

//     res.render('users/orders',{orders})
//   })

// })
router.get('/search', async (req, res) => {
  let user = req.session.user;
  console.log('user', user)
  let products = await productHelpers.getAllProducts()
  res.render('users/search', { products, user })
})







// router.get('/add-to-wishlist/:id',verifyLogin,(req,res)=>{
//   console.log('ID',req.params)
//   userHelpers.doWishlist(req.params.id,req.session.user._id).then((products)=>{
//     res.redirect('/wishlist',{products,isLoginPage:true})
//   })
// })

// router.post('/remove-product',(req,res)=>{
//   console.log('body',req.body)
//   userHelpers.removeProduct(req.body).then(()=>{
//     res.render('users/cart')


//   })
// })





// router.post('/', (req, res) => {
//   console.log('search data',req.body)
//   let searchValue = req.body.value;  // Get search value
//   let selectedCategory = req.body.category;  // Get the selected category

//   // Modify doSearch to accept both search value and category
//   userHelpers.doSearch(searchValue, selectedCategory).then((searchProduct) => {
//       res.render('users/search', { searchProduct }); // Pass search results to the view
//   }).catch((error) => {
//       console.error("Error while searching:", error);
//       res.render('users/search', { searchProduct: [], error: "No products found." });
//   });
// });











module.exports = router;
