var express = require("express");
var router = express.Router();
var articleModel = require("../models/articles");
var orderModel = require("../models/orders");
var userModel = require("../models/users");

const stripe = require("stripe")(
  "sk_test_51HQ84jAXaqH2oTbzs6WzzYrmyFALxjsUc5LMZ9qUO5U0xbIrLCQ1IlcDw8HszRZZGLQCkmLkPhXX6U85gAbTlps000GwYlnt4c"
);

var dataBikeArray = [
  {
    id: 1,
    name: "BIK045",
    url: "/images/bike-1.jpg",
    price: 679,
    mea: true,
    modeLiv: [1, 2],
    stock: 0,
  },
  {
    id: 2,
    name: "ZOOK07",
    url: "/images/bike-2.jpg",
    price: 999,
    mea: true,
    modeLiv: [1, 3],
    stock: 10,
  },
  {
    id: 3,
    name: "TITANS",
    url: "/images/bike-3.jpg",
    price: 799,
    mea: false,
    modeLiv: [1, 2, 3],
    stock: 2,
  },
  {
    id: 4,
    name: "CEWO",
    url: "/images/bike-4.jpg",
    price: 1300,
    mea: true,
    modeLiv: [1, 2, 3],
    stock: 2,
  },
  {
    id: 5,
    name: "AMIG039",
    url: "/images/bike-5.jpg",
    price: 479,
    mea: false,
    modeLiv: [1, 2, 3],
    stock: 2,
  },
  {
    id: 6,
    name: "LIK099",
    url: "/images/bike-6.jpg",
    price: 869,
    mea: true,
    modeLiv: [1, 2, 3],
    stock: 2,
  },
];

var codePromoTab = [
  {
    id: 1,
    code: "REDUC30",
    libelle: "30€ de réduction immédiate",
    type: "montant",
    montant: 30,
  },
  {
    id: 1,
    code: "20POURCENT",
    libelle: "-20%, cadeau de la maison",
    type: "pourcent",
    montant: 20,
  },
];

// Fonction qui calcule les frais de port et le total de la commande
var calculTotalCommande = (dataCardBike, modeLivraison) => {
  if (dataCardBike.length == 0) {
    return { montantFraisPort: 0, totalCmd: 0 };
  }

  var totalCmd = 0;
  var montantFraisPort = modeLivraison.montant;

  for (var i = 0; i < dataCardBike.length; i++) {
    totalCmd += dataCardBike[i].quantity * dataCardBike[i].price;
  }

  totalCmd += montantFraisPort;

  return { montantFraisPort, totalCmd };
};

var getModeLivraison = (dataCardBike) => {
  var nbProduits = 0;
  var totalCmd = 0;

  var listMLDispoProducts = [];

  for (var i = 0; i < dataCardBike.length; i++) {
    nbProduits += Number(dataCardBike[i].quantity);
    totalCmd += dataCardBike[i].quantity * dataCardBike[i].price;

    if (i == 0) {
      listMLDispoProducts = dataCardBike[i].modeLiv;
    }
    listMLDispoProducts = listMLDispoProducts.filter((e) =>
      dataCardBike[i].modeLiv.includes(e)
    );
  }

  // Règle frais de port standard
  var montantFraisPortStandard = nbProduits * 30;

  if (totalCmd > 4000) {
    montantFraisPortStandard = 0;
  } else if (totalCmd > 2000) {
    montantFraisPortStandard = montantFraisPortStandard / 2;
  }

  // Règle frais de port express
  var montantFraisPortExpress = montantFraisPortStandard + 100;

  // Règle frais de port Retrait
  var montantFraisPortRetrait = nbProduits * 20 + 50;

  var listeModeLivraison = [
    {
      id: 1,
      libelle: "Frais de port standard",
      montant: montantFraisPortStandard,
    },
    {
      id: 2,
      libelle: "Frais de port Express",
      montant: montantFraisPortExpress,
    },
    {
      id: 3,
      libelle: "Frais de port Retrait",
      montant: montantFraisPortRetrait,
    },
  ];

  listeModeLivraison = listeModeLivraison.filter((e) =>
    listMLDispoProducts.includes(e.id)
  );

  return listeModeLivraison.sort(
    (a, b) => parseFloat(a.montant) - parseFloat(b.montant)
  );
};

// Fonction qui récupère les 3 produits à mettre en avant
var getMeaList = (dataBike) => {
  dataBike.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
  dataBike = dataBike.filter((a) => a.mea === true);
  dataBike = dataBike.slice(0, 3);
  return dataBike;
};

var getProducts = (products, cardBike) => {
  for (var i = 0; i < products.length; i++) {
    if (products[i].stockInBasket === undefined) {
      products[i].stockInBasket = 0;
    }
    products[i].stockDispo = products[i].stock - products[i].stockInBasket;
  }

  return products;
};

router.get("/", async function (req, res, next) {
  if (req.session.user == null) {
    res.redirect("/login");
    return;
  }

  if (req.session.dataCardBike == undefined) {
    req.session.dataCardBike = [];
    req.session.promoCmd = [];
  }

  var dataBikeArray = await articleModel.find();

  var dataBike = getProducts(dataBikeArray, req.session.dataCardBike);
  var mea = getMeaList(dataBike);

  res.render("index", { dataBike, mea });
});

router.get("/shop", async function (req, res, next) {
  if (req.session.dataCardBike == undefined) {
    req.session.dataCardBike = [];
    req.session.promoCmd = [];
  }

  // Liste des modes de livraison
  var modeLivraison = getModeLivraison(req.session.dataCardBike);

  // Par defaut, on propose le mode de livraison le moins cher
  if (req.session.modeLivraison == undefined) {
    req.session.modeLivraison = modeLivraison[0];
  }

  req.session.modeLivraison = modeLivraison.find(
    (e) => e.id == req.session.modeLivraison.id
  );

  var infoCommande = calculTotalCommande(
    req.session.dataCardBike,
    req.session.modeLivraison
  );

  // Total commande + promos à afficher
  var montantCommande = infoCommande.totalCmd;
  var promoCmd = [];
  var products = [];

  // Application des codes promos
  for (var i = 0; i < req.session.promoCmd.length; i++) {
    if (req.session.promoCmd[i].type === "montant") {
      var reduction = req.session.promoCmd[i].montant;
      montantCommande -= reduction;
    } else {
      var reduction =
        Math.round(
          (100 * req.session.promoCmd[i].montant * montantCommande) / 100
        ) / 100;
      montantCommande -= reduction;
    }
    promoCmd.push(req.session.promoCmd[i]);
  }

  // Application de la réduction automatique de 20% pour 2 vélos achetés (du même modèle)
  for (var i = 0; i < req.session.dataCardBike.length; i++) {
    if (req.session.dataCardBike[i].quantity > 1) {
      var reduction =
        Math.round(req.session.dataCardBike[i].price * 0.2 * 100) / 100;
      promoCmd.push({
        code: "2FOISMIEUX",
        libelle: "-20% pour 2 vélos achetés",
        type: "montant",
        montant: reduction,
      });
      montantCommande -= reduction;
    }

    products.push({
      name: req.session.dataCardBike[i].name,
      url: req.session.dataCardBike[i].url,
      price: req.session.dataCardBike[i].price,
      quantity: req.session.dataCardBike[i].quantity,
      articleId: req.session.dataCardBike[i].id,
    });
  }

  if (req.session.idbdd) {
    await orderModel.updateOne(
      { _id: req.session.idbdd, userId: req.session.user.id },
      {
        dateCommande: Date.now(),
        montantTotal: montantCommande,
        montantProduits: infoCommande.totalCmd - infoCommande.montantFraisPort,
        montantFraisPort: infoCommande.montantFraisPort,
        montantReduction:
          Math.round((montantCommande - infoCommande.totalCmd) * 100) / 100,
        commandeValide: false,
        products,
      }
    );
  } else {
    var newOrder = new orderModel({
      dateCommande: Date.now(),
      montantTotal: montantCommande,
      montantProduits: infoCommande.totalCmd - infoCommande.montantFraisPort,
      montantFraisPort: infoCommande.montantFraisPort,
      montantReduction:
        Math.round((montantCommande - infoCommande.totalCmd) * 100) / 100,
      commandeValide: false,
      userId: req.session.user.id,
      products,
    });

    var order = await newOrder.save();

    // On stocke l'id de la commande en session
    req.session.idbdd = order.id;
  }

  res.render("shop", {
    dataCardBike: req.session.dataCardBike,
    selectedModeLiv: req.session.modeLivraison,
    modeLivraison,
    montantCommande,
    promoCmd,
  });
});

router.get("/add-shop", async function (req, res, next) {
  var alreadyExist = false;

  var article = await articleModel.findById(req.query.id);

  if (article.stock - article.stockInBasket > 0) {
    for (var i = 0; i < req.session.dataCardBike.length; i++) {
      if (req.session.dataCardBike[i].id == req.query.id) {
        req.session.dataCardBike[i].quantity =
          req.session.dataCardBike[i].quantity + 1;
        alreadyExist = true;
      }
    }

    if (alreadyExist == false) {
      var searchProduct = await articleModel.findById(req.query.id);
      var selectedProduct = {
        id: searchProduct.id,
        name: searchProduct.name,
        url: searchProduct.url,
        mea: searchProduct.mea,
        price: searchProduct.price,
        stock: searchProduct.stock,
        modeLiv: searchProduct.modeLiv,
        quantity: 1,
      };
      req.session.dataCardBike.push(selectedProduct);
    }

    await articleModel.updateOne(
      { _id: req.query.id },
      { $inc: { stockInBasket: 1 } }
    );
  }

  res.redirect("/shop");
});

router.post("/add-codepromo", function (req, res, next) {
  var codePromo = req.body.codePromo;

  // On vérifie que le code promo est dans la liste
  var codePromoApply = codePromoTab.find(
    (element) => element.code == codePromo
  );

  if (codePromoApply) {
    req.session.promoCmd.push(codePromoApply);
  }

  res.redirect("/shop");
});

router.get("/del-codepromo", function (req, res, next) {
  req.session.promoCmd = [];

  res.redirect("/shop");
});

router.post("/update-modeliv", function (req, res, next) {
  var modeLivraison = getModeLivraison(req.session.dataCardBike);

  var selectedModeLiv = modeLivraison.find(
    (element) => element.id == req.body.modeLivraison
  );

  req.session.modeLivraison = selectedModeLiv;

  res.redirect("/shop");
});

router.get("/delete-shop", async function (req, res, next) {
  var position;
  var quantityToDelete = 0;

  for (let i = 0; i < req.session.dataCardBike.length; i++) {
    if (req.session.dataCardBike[i].id === req.query.id) {
      position = i;
      quantityToDelete = -1 * req.session.dataCardBike[i].quantity;
    }
  }

  req.session.dataCardBike.splice(req.query.id, 1);

  await articleModel.updateOne(
    { _id: req.query.id },
    { $inc: { stockInBasket: quantityToDelete } }
  );

  res.redirect("/shop");
});

router.post("/update-shop", async function (req, res, next) {
  var id = req.body.id;
  var newQuantity = Number(req.body.quantity);
  var position;
  var stockLeft = true;
  var quantityToUpdate = 0;

  for (let i = 0; i < req.session.dataCardBike.length; i++) {
    if (req.session.dataCardBike[i].id === id) {
      position = i;
      quantityToUpdate = newQuantity - req.session.dataCardBike[i].quantity;
    }
  }

  if (quantityToUpdate > 0) {
    var article = await articleModel.findById(id);
    var stockDispo = article.stock - article.stockInBasket;
    if (stockDispo < quantityToUpdate) {
      newQuantity = newQuantity - quantityToUpdate + stockDispo;
      quantityToUpdate = stockDispo;
      if (quantityToUpdate === 0) {
        stockLeft = false;
      }
    }
  }

  if (stockLeft === true) {
    req.session.dataCardBike[position].quantity = newQuantity;
    await articleModel.updateOne(
      { _id: id },
      { $inc: { stockInBasket: quantityToUpdate } }
    );
  }

  res.redirect("/shop");
});

router.post("/create-checkout-session", async (req, res) => {
  if (req.session.dataCardBike == undefined) {
    req.session.dataCardBike = [];
    req.session.promoCmd = [];
  }

  var infoCommande = calculTotalCommande(
    req.session.dataCardBike,
    req.session.modeLivraison
  );

  var montantFraisPort = infoCommande.montantFraisPort;
  var totalCmd = infoCommande.totalCmd;
  var promoCmd = [...req.session.promoCmd];

  var stripeItems = [];

  for (var i = 0; i < req.session.dataCardBike.length; i++) {
    stripeItems.push({
      price_data: {
        currency: "eur",
        product_data: {
          name: req.session.dataCardBike[i].name,
        },
        unit_amount: req.session.dataCardBike[i].price * 100,
      },
      quantity: req.session.dataCardBike[i].quantity,
    });
  }

  // Application de la réduction automatique de 20% pour 2 vélos achetés (du même modèle)
  for (var i = 0; i < req.session.dataCardBike.length; i++) {
    if (req.session.dataCardBike[i].quantity > 1) {
      var reduction =
        Math.round(req.session.dataCardBike[i].price * 0.2 * 100) / 100;
      promoCmd.push({
        code: "2FOISMIEUX",
        libelle: "-20% pour 2 vélos achetés",
        type: "montant",
        montant: reduction,
      });
    }
  }

  // On applique les promotions sur les différents produits de la session Stripe
  for (var i = 0; i < promoCmd.length; i++) {
    var montantRestant;
    if (promoCmd[i].type === "montant") {
      montantRestant = promoCmd[i].montant;
    } else {
      montantRestant = (totalCmd * promoCmd[i].montant) / 100;
    }

    for (var j = 0; j < stripeItems.length; j++) {
      if (montantRestant > 0) {
        if (
          stripeItems[j].price_data.unit_amount * stripeItems[j].quantity >
          montantRestant * 100 + 1
        ) {
          stripeItems[j].price_data.unit_amount =
            stripeItems[j].price_data.unit_amount -
            (montantRestant * 100) / stripeItems[j].quantity;
          montantRestant = 0;
        } else {
          montantRestant -=
            (stripeItems[j].price_data.unit_amount / 100 - 1) *
            stripeItems[j].quantity;
          stripeItems[j].price_data.unit_amount = 100;
        }
      }
    }
  }

  if (montantFraisPort > 0) {
    stripeItems.push({
      price_data: {
        currency: "eur",
        product_data: {
          name: "Frais de port",
        },
        unit_amount: montantFraisPort * 100,
      },
      quantity: 1,
    });
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: stripeItems,
    mode: "payment",
    success_url: "http://localhost:3000/success",
    cancel_url: "http://localhost:3000/",
  });

  res.redirect(303, session.url);
});

router.get("/success", async function (req, res, next) {
  await orderModel.updateOne(
    { _id: req.session.idbdd, userId: req.session.user.id },
    {
      commandeValide: true,
    }
  );
  req.session.dataCardBike = [];
  req.session.promoCmd = [];
  res.render("confirm");
});

router.get("/orders", async function (req, res, next) {
  if (req.session.user == null) {
    res.redirect("/login");
  }
  var orders = await orderModel.find({ userId: req.session.user.id });
  res.render("orders", { orders });
});

router.get("/addProduct", function (req, res, next) {
  res.render("addProduct");
});

router.post("/addProduct", async function (req, res, next) {
  var newProduct = new articleModel({
    name: req.body.name,
    url: req.body.url,
    mea: req.body.mea,
    price: req.body.price,
    stock: req.body.stock,
    stockInBasket: 0,
    modeLiv: req.body.modeliv.map((e) => Number(e)),
  });

  await newProduct.save();

  res.redirect("/addProduct");
});

router.post("/sign-up", async function (req, res, next) {
  var searchUser = await userModel.findOne({
    email: req.body.emailFromFront,
  });

  if (!searchUser) {
    var newUser = new userModel({
      username: req.body.usernameFromFront,
      email: req.body.emailFromFront,
      password: req.body.passwordFromFront,
    });

    var newUserSave = await newUser.save();

    req.session.user = {
      id: newUserSave._id,
    };

    res.redirect("/");
  } else {
    res.redirect("/login");
  }
});

router.post("/sign-in", async function (req, res, next) {
  var searchUser = await userModel.findOne({
    email: req.body.emailFromFront,
    password: req.body.passwordFromFront,
  });

  if (searchUser != null) {
    req.session.user = {
      id: searchUser._id,
    };

    res.redirect("/");
  } else {
    res.redirect("/login");
  }
});

router.get("/logout", function (req, res, next) {
  req.session.user = null;

  res.redirect("/");
});

router.get("/login", function (req, res, next) {
  res.render("login");
});

router.get("/charts", async function (req, res, next) {
  var aggr = userModel.aggregate();
  aggr.group({
    _id: { year: { $year: "$date" }, month: { $month: "$date" } },
    nb: { $sum: 1 },
  });
  aggr.sort({ _id: 1 });
  var nbUserByMonth = await aggr.exec();

  var aggr = orderModel.aggregate();
  aggr.match({ commandeValide: true });
  aggr.group({
    _id: {
      year: { $year: "$dateCommande" },
      month: { $month: "$dateCommande" },
    },
    nb: { $sum: 1 },
  });
  aggr.sort({ _id: 1 });
  var nbCmdByMonth = await aggr.exec();

  var aggr = orderModel.aggregate();
  aggr.match({ commandeValide: true });
  aggr.unwind({ path: "$products", preserveNullAndEmptyArrays: true });
  aggr.group({
    _id: "$products.name",
    nbventes: { $sum: "$products.quantity" },
  });
  aggr.sort({ _id: -1 });

  var topProducts = await aggr.exec();
  topProducts = topProducts.slice(0, 10);

  res.render("charts", { nbCmdByMonth, nbUserByMonth, topProducts });
});

module.exports = router;
