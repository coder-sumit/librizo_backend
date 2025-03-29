const createRazorpayInstance = require("../../config/razorpay.config");
const razorpayInstance = createRazorpayInstance();
const crypto = require("crypto");
const {RAZORPAY_API_SECRET, RAZORPAY_API_KEY} = require("../../config");
const successBody = require("../../services/successBodyGenerator");
const mysql = require("mysql2/promise");
const { mysqlDB } = require("../../config/mysql");
const uid = require("uuid");
const bcrypt = require("bcrypt");
const nodemailer = require('nodemailer');
const {GMAIL_APP_PASSWORD} = require("../../config");

const db = mysql.createPool(mysqlDB);

function calculateExpiry(validityInDays) {
    
    const today = new Date();
    today.setDate(today.getDate() + validityInDays);
    const expiryDate = today.toISOString().split('T')[0];

    return expiryDate;
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).replace(/ /g, ' ');
}


const createOrder = async(req, res, next)=>{

    try {
        const { libraryName, email, planId, mobile } = req.body;

  
        

        //  Basic validation
        if (!libraryName || !email || !planId || !mobile) {
            return res.status(400).json({
                success: false,
                message: "All fields are required!"
            });
        }

        // calculate amt
        const query = `SELECT * FROM librizo_subscription_plans WHERE plan_id = ?`;

        let [planData] = await db.query(query, planId);

        planData= planData[0];

        

        if(!planData){
            return res.status(400).json({
                success: false,
                message: "Invalid planId!"
            });
        }

        let discount = parseFloat(planData?.discount);

        // write logic to check extra discount first 5 users (5%) first 15 users (2%)

       let [libraryCount] = await db.query(`SELECT COUNT(*) AS lib_count FROM library`);
        if(libraryCount[0]?.lib_count < 5){
            discount += 5;
        }else if(libraryCount[0]?.lib_count < 15){
            discount += 2;
        }
        planData.discount = discount;

        planData.discounted_price = parseFloat(parseFloat(planData.plan_price) * ((100 - parseFloat(planData.discount))/100)).toFixed(2);

        //  Create order on Razorpay
        const options = {
            amount: parseInt(planData.discounted_price * 100), // Convert amount to paise
            currency: 'INR',
            receipt: `order_rcpt_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
            notes: {
                libraryName: libraryName,
                email: email,
                planId: planId,
                contact: mobile
            }
        };

        

        //  Razorpay Order Creation
        const order = await razorpayInstance.orders.create(options);
        

        if (!order) {
            return res.status(500).json({
                success: false,
                message: "Error while creating order!"
            });
        }

        // insert order into database
        const insertOrderQuery = `INSERT INTO subscription_orders (order_id, library_name, plan_id, amount, email, contact, receipt) VALUES (?, ?, ?, ?, ?, ?, ?)`;

        const orderValues = [
            order.id, libraryName, planData.plan_id, parseFloat(parseFloat(planData.discounted_price).toFixed(2)), email, mobile, order.receipt
        ];


        // save order to db
        await db.query(insertOrderQuery, orderValues);

        return res.status(200).json(successBody("Order created successfully!", {
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            razorpay_api_key: RAZORPAY_API_KEY,
            name: libraryName,
            contact: mobile,
            plan_id: planId,
        }));
    }
    catch(err){
        console.log(err);
        
        return res.status(500).json({
            success: false,
            message: "Something went wrong!"
        })
    }

}

const verifySubscriptionPayment = async(req, res, next)=>{
    try{
            const {order_id, payment_id, signature, libDataBody} = req.body;
            
            // generate hmac object
            const hmac = crypto.createHmac("sha256", RAZORPAY_API_SECRET);
        
            hmac.update(order_id + "|" +  payment_id);
        
            const generatedSignature = hmac.digest("hex");

            if(generatedSignature !== signature){
                return res.status(400).json({
                    success: false,
                    message: "Payment not verified"
                });
            }


       

            // create librray with new expiry date
            const library_id = uid.v4();
            const library_name = libDataBody.libraryName;
            const check_in_qr = uid.v4();
            const check_out_qr = uid.v4();
            const owner_name = libDataBody.ownerName;
            const contact_number = libDataBody.phone;
            const pincode = libDataBody.pincode;
            const city = libDataBody.city;
            let total_seats = libDataBody.cabinCountInput;
            const email = libDataBody.email;
            const password = libDataBody.password;

            // get plan_id for order
            let planIdQuery = `SELECT plan_id, amount FROM subscription_orders WHERE order_id=?`;
            let [plan_id] = await db.query(planIdQuery, order_id);
            const amount = plan_id[0]?.amount;
            plan_id = plan_id[0]?.plan_id;
            

            // get plan data to calculate plan expiry date
            let planDataQuery = `SELECT * FROM librizo_subscription_plans WHERE plan_id=?`;
            let [planData] = await db.query(planDataQuery, plan_id);
            planData = planData[0];
            
            const plan_validity = parseInt(planData?.validity_days);
            
            const max_seats = planData?.max_cabin_count;
            const max_users = planData?.max_user_count;
            const plan_name = planData?.plan_name;
            const plan_price = planData?.plan_price;
            const plan_discount = planData?.discount;
            const plan_expiry = calculateExpiry(plan_validity + 1);
            const plan_status = 'active';
            const active_plan = plan_name;

            // calculate special discount value for librray
            let special_discount = 0.00;

            let [libraryCount] = await db.query(`SELECT COUNT(*) AS lib_count FROM library`);
            if(libraryCount[0]?.lib_count < 5){
                special_discount = 5.00;
            }else if(libraryCount[0]?.lib_count < 15){
                special_discount  += 2.00;
            }

            // check if max seat count is greater then total or not
            if(total_seats > max_seats){
                total_seats = max_seats;
            }

            // data is prepared for library creation 
            const createLibraryQuery = `INSERT INTO library (library_id, library_name, owner_name, contact_number, pincode, city, total_seats, max_seats, max_users, plan_expiry, active_plan, plan_status, check_in_qr, check_out_qr, special_discount, email, plan_id)    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?, ?)`;
            const createLibraryValues = [library_id, library_name, owner_name, contact_number, pincode, city, total_seats, max_seats, max_users, plan_expiry, active_plan, plan_status, check_in_qr, check_out_qr, special_discount, email, plan_id];


            // register library  
            await db.query(createLibraryQuery, createLibraryValues);

            // insert library user into database

            const user_id = uid.v4();
            const first_name = owner_name.split(" ")[0];
            const last_name = owner_name.split(" ")[1]? owner_name.split(" ")[1]: null;
            const role = 'admin';
             // Generate salt with 10 rounds
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // insert user query 
            const insertUserQuery = `INSERT INTO library_user (user_id, library_id, first_name, last_name, mobile, role, city, email, password) VALUES(?,?,?,?,?,?,?,?,?)`;
            const insertUserValues = [user_id, library_id, first_name, last_name, contact_number, role, city, email, hashedPassword];

            // register user
            await db.query(insertUserQuery, insertUserValues);

            // now update order status to paid
            let updatesubscriptionOrdersQuery = `UPDATE subscription_orders SET order_status=? WHERE order_id=?`;
            let updatesubscriptionOrdersValues = ['completed', order_id];
            // update order
            await db.query(updatesubscriptionOrdersQuery, updatesubscriptionOrdersValues);


            const transaction_id = uid.v4();
            const payment_status = 'captured';
            
            // now insert transaction into database
            const insertTransactionQuery = `INSERT INTO subscription_payment_transactions (transaction_id, order_id, payment_id, library_id, plan_id, amount, payment_status, email, contact) VALUES (?,?,?,?,?,?,?,?,?)`;
            const insertTransactionValues = [transaction_id, order_id, payment_id, library_id, plan_id, amount, payment_status, email, contact_number];


            // insert transaction
            await db.query(insertTransactionQuery, insertTransactionValues);

            // insert into invoice table
            const invoice_year = new Date().getFullYear();
            const product_type = 'subscription';
            const product_details = plan_name;
            const discounted_price = amount;
            const qty = 1;
            const sub_total = amount;
            const total_amt = plan_price;
            const total = amount;

            const invoice_code = 'LBRZ';
            const discount_amt = parseFloat(parseFloat(plan_price) - parseFloat(amount)).toFixed(2);
            
            // prepare insert query
            const insertInvoiceQuer = `INSERT INTO invoices (invoice_year, invoice_code, transaction_id, product_type, library_id, product_details, price, discount, discounted_price, qty, sub_total, total_discount, total_amt, total) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
            const insertInvoiceValues = [invoice_year, invoice_code, transaction_id, product_type, library_id, product_details, plan_price, plan_discount, discounted_price, qty, sub_total, discount_amt, total_amt, total];

            // insert invoice
            await db.query(insertInvoiceQuer, insertInvoiceValues);

            // send email to library owner

            // Create Transporter
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                user: 'librizosaas@gmail.com', 
                pass: GMAIL_APP_PASSWORD,  
                },
            });

            // Email Options
            const mailOptions = {
                from: 'Librizo <librizosaas@gmail.com>', 
                to: `${email}`, 
                subject: '🎉 Welcome to Librizo! Manage Your Library Like a Pro 🚀',
                html: `<!DOCTYPE html>
            <html>
            <head>
              <style>
                body {
                  font-family: 'Arial', sans-serif;
                  background-color: #f4f4f7;
                  margin: 0;
                  padding: 0;
                }
                .container {
                  width: 100%;
                  max-width: 600px;
                  margin: 20px auto;
                  background-color: #ffffff;
                  padding: 20px;
                  border-radius: 12px;
                  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                  border-top: 5px solid #4153F1;
                }
                h2 {
                  color: #4153F1;
                  margin-bottom: 10px;
                  text-align: center;
                }
                p {
                  font-size: 14px;
                  line-height: 1.6;
                  color: #555555;
                  margin: 8px 0;
                }
                .highlight {
                  font-weight: bold;
                  color: #2c3e50;
                }
                .btn-container {
                  text-align: center;
                  margin-top: 20px;
                }
                .btn {
                  display: inline-block;
                  background-color: #4153F1;
                  color: #ffffff;
                  text-decoration: none;
                  padding: 12px 24px;
                  border-radius: 8px;
                  font-size: 14px;
                  transition: background-color 0.3s;
                }
                .btn:hover {
                  background-color: #3949ab;
                }
                .info-box {
                  margin-top: 20px;
                  background-color: #f4f6ff;
                  padding: 12px 20px;
                  border-radius: 8px;
                  border-left: 5px solid #4153F1;
                }
                .note {
                  margin-top: 15px;
                  font-size: 12px;
                  color: #777777;
                  line-height: 1.4;
                  text-align: center;
                }
                .footer {
                  text-align: center;
                  margin-top: 20px;
                  font-size: 12px;
                  color: #999999;
                }
                .thank-you {
                  text-align: center;
                  font-size: 14px;
                  font-weight: bold;
                  color: #4153F1;
                  margin-top: 15px;
                }
            
                /* ✅ Media Query for Mobile */
                @media screen and (max-width: 600px) {
                  .container {
                    width: 90%;
                    padding: 15px;
                  }
                  .btn {
                    width: 70%;
                    text-align: center;
                  }
                  .info-box {
                    padding: 10px 15px;
                  }
                }
              </style>
            </head>
            <body>
              <div class="container">
               <h2>🎉 Welcome to Librizo!</h2>
                <p>Hello <span class="highlight">${owner_name}</span>,</p>
                <p>Your library, <span class="highlight">${library_name}</span>, has been registered successfully! 🎯 Below are your login credentials:</p>
                ${special_discount > 0 ? `<p style="color: #28a745; font-weight: bold;">🎁 Congratulations! You have availed a ${special_discount}% special discount on top of the running discount for a lifetime! 💸</p>` : ''}
                <div class="info-box">
                  <p>🌐 <strong>Plan:</strong> <span class="highlight">${plan_name}</span></p>
                  <p>👤 <strong>Email:</strong> <span class="highlight">${email}</span></p>
                  <p>🔒 <strong>Password:</strong> <span class="highlight">${password}</span></p>
                  <p>⏳ <strong>Plan Expiry:</strong> <span class="highlight">${formatDate(plan_expiry)}</span></p>
                </div>
            
                <div class="btn-container">
                  <a href="app.librizo.in" class="btn" target="_blank">🚀 Go to Dashboard</a>
                </div>
            
                <p class="note">
                    💡  Please <span class="highlight">mark this email as important</span> to avoid losing your credentials.
                </p>
            
                <p class="thank-you">🙏 Thanks for choosing Librizo! 🚀</p>
            
                <p class="footer">
                  Need help? Contact us at <a href="mailto:librizosaas@gmail.com" style="color: #4153F1;">librizosaas@gmail.com</a>
                </p>
              </div>
            </body>
            </html>
            `
              };

              // Send Email
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error('Error sending email:', error);
                } else {
                    console.log('Email sent:', info.response);
                }
            }
            );


           const responseBodyData = {
             transaction_id: transaction_id,
             library_name: library_name,
             plan_name: plan_name,
             amount: amount,     
            }

            return res.status(200).json({
                success: true,
                message: "Payment verified",
                data: responseBodyData
            });    
           
        }catch(err){
            console.log(err);
            
            return res.status(500).json({
                success: false,
                message: "Payment not verified"
            });
        }
}



module.exports = {createOrder, verifySubscriptionPayment};