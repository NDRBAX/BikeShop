var express = require('express');
var router = express.Router();
const stripe = require('stripe')('sk_test_51KnUwYAHcK9anL8BRTWeSXkhmCKKhVfB1aUcZuUnIweeiJFids38BlGjwH85SfFBo0LLSpwiz3I3bymQbxL4NarP00K4K8Dly7');

var dataBike = [
    { name: "BIK045", url: "/images/bike-1.jpg", price: 679 },
    { name: "ZOOK07", url: "/images/bike-2.jpg", price: 999 },
    { name: "TITANS", url: "/images/bike-3.jpg", price: 799 },
    { name: "CEWO", url: "/images/bike-4.jpg", price: 1300 },
    { name: "AMIG039", url: "/images/bike-5.jpg", price: 479 },
    { name: "LIK099", url: "/images/bike-6.jpg", price: 869 },
]

// CALCUL DES FRAIS DE PORT

var calculTotalCmd = (dataCardBike) => {
    var nbProduits = 0;
    var totalCmd = 0;

    for (var i = 0; i < dataCardBike.length; i++) {
        nbProduits += dataCardBike[i].quantity;
        totalCmd += dataCardBike[i].quantity * dataCardBike[i].price;
    }
    // 👉 Pour chaque produit acheté, 30€ de frais de port
    var montantFraisPort = nbProduits * 30;
    // 👉 Si la commande dépasse 4000€ (hors frais de port), les frais de port sont gratuits
    if (totalCmd > 4000) {
        montantFraisPort = 0;
        // 👉 Si la commande dépasse 2000€ (hors frais de port), réduction de 50%
    } else if (totalCmd > 2000) {
        montantFraisPort = montantFraisPort / 2;
    }

    totalCmd += montantFraisPort;
    return { montantFraisPort, totalCmd };
}


/* 
? ******* GET home page ******* */

router.get('/', function(req, res, next) {
    if (req.session.dataCardBike == undefined) {
        req.session.dataCardBike = [];
    }
    res.render('index', { dataBike: dataBike });
});
/* 
? ******* SHOP PAGE ******* */

router.get('/shop', async function(req, res, next) {
    if (req.session.dataCardBike == undefined) {
        req.session.dataCardBike = [];
    }
    var total = calculTotalCmd(req.session.dataCardBike);

    // Frais de port
    var montantFraisPort = total.montantFraisPort;

    // Total commande
    var montantCommande = total.totalCmd;
    console.log(req.session, montantFraisPort, montantCommande);

    res.render('shop', { dataCardBike: req.session.dataCardBike, montantFraisPort, montantCommande });
});

router.get('/add-shop', async function(req, res, next) {
    if (req.session.dataCardBike == undefined) {
        req.session.dataCardBike = [];
    }
    var alreadyExist = false;
    for (var i = 0; i < req.session.dataCardBike.length; i++) {
        if (req.session.dataCardBike[i].name == req.query.bikeNameFromFront) {
            req.session.dataCardBike[i].quantity = req.session.dataCardBike[i].quantity + 1;
            alreadyExist = true;
        }
    }
    if (alreadyExist == false) {
        req.session.dataCardBike.push({
            name: req.query.bikeNameFromFront,
            url: req.query.bikeImageFromFront,
            price: req.query.bikePriceFromFront,
            quantity: 1
        });
    }
    res.redirect('/shop');
});

/* 
! ******* TRASHBOX ACTIVE ******* */
router.get('/delete-shop', async function(req, res, next) {
    if (req.session.dataCardBike == undefined) {
        req.session.dataCardBike = [];
    }
    req.session.dataCardBike.splice(req.query.position, 1)
    res.redirect('/shop');
})

/* 
 * ******* UPDATE-SHOP ******* */
router.post('/update-shop', async function(req, res, next) {
    var position = req.body.position;
    var newQuantity = req.body.quantity;
    req.session.dataCardBike[position].quantity = Number(newQuantity);
    res.redirect('/shop');
});

/* 
 * ******* CHECKOUT-SESSION ******* */

router.post('/create-checkout-session', async(req, res) => {
    if (req.session.dataCardBike == undefined) {
        req.session.dataCardBike = [];
    }
    var total = calculTotalCmd(req.session.dataCardBike);

    // Frais de port  
    var montantFraisPort = total.montantFraisPort;
    var stripeItems = [];

    for (var i = 0; i < res.session.dataCardBike.length; i++) {
        stripeItems.push({
            price8data: {
                courrency: 'eur',
                product_data: {
                    name: req.session.dataCardBike[i].name,
                },
                unit_amount: req.session.dataCardBike[i].price * 100,
            },
            quantity: req.session.dataCardBike[i].quantity,
        });
    }

    if (montantFraisPort > 0) {
        stripeItems.push({
            price_data: {
                currency: 'eur',
                product_data: {
                    name: 'Frais de port',
                },
                unit_amount: montantFraisPort * 100,
            },
            quantity: 1,
        });
    }

    const session = await stripe.checkout.sessions.create({
        payement_method_types: ['card'],
        line_items: stripeItems,
        mode: 'payement',
        success_url: 'http://localhost:3000/succes',
        cancel_url: 'http://localhost:3000/'
    });

    res.redirect(303, session.url);
})


router.get('/confirm', function(req, res, next) {
    res.render('confirm')
})

module.exports = router;