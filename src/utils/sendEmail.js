const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false, // true for port 465, false for 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * @param {string} toEmail   
 * @param {string} name     
 * @param {string} password  
 */
const sendEmployeeWelcomeEmail = async (toEmail, name, password) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: toEmail,
    subject: "Welcome to ProMonkey Team — Your Login Credentials",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #4F46E5;">Welcome to ProMonkey Team, ${name}!</h2>
        <p>Your account has been created by the admin. Here are your login credentials:</p>

        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 10px; background: #f5f5f5; font-weight: bold; width: 40%;">Email</td>
            <td style="padding: 10px; background: #fafafa;">${toEmail}</td>
          </tr>
          <tr>
            <td style="padding: 10px; background: #f5f5f5; font-weight: bold;">Password</td>
            <td style="padding: 10px; background: #fafafa;">${password}</td>
          </tr>
        </table>

        <p style="color: #e53e3e; font-size: 13px;">
          ⚠️ Please change your password after your first login for security.
        </p>

        <p style="margin-top: 24px; color: #555;">
          If you have any issues logging in, please contact your administrator.
        </p>

        <p style="color: #888; font-size: 12px; margin-top: 32px;">— ProMonkey CRM Team</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

/**
 * @param {string} toEmail  
 * @param {string} name  
 * @param {string} password  
 */
const sendClientWelcomeEmail = async (toEmail, name, password) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: toEmail,
    subject: "Welcome to ProMonkey — Your Client Portal Access",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #4F46E5;">Welcome to ProMonkey, ${name}!</h2>
        <p>Your client account has been created. You can now log in to the client portal using the credentials below:</p>

        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 10px; background: #f5f5f5; font-weight: bold; width: 40%;">Email</td>
            <td style="padding: 10px; background: #fafafa;">${toEmail}</td>
          </tr>
          <tr>
            <td style="padding: 10px; background: #f5f5f5; font-weight: bold;">Password</td>
            <td style="padding: 10px; background: #fafafa;">${password}</td>
          </tr>
        </table>

        <p style="color: #e53e3e; font-size: 13px;">
          ⚠️ Please change your password after your first login for security.
        </p>

        <p style="margin-top: 24px; color: #555;">
          If you have any questions, feel free to reach out to us.
        </p>

        <p style="color: #888; font-size: 12px; margin-top: 32px;">— ProMonkey Team</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendEmployeeWelcomeEmail, sendClientWelcomeEmail };
