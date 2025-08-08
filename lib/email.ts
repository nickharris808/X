import nodemailer from "nodemailer"
const { google } = require("googleapis");

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || "https://developers.google.com/oauthplayground"
);
oAuth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

export async function sendCompletionEmail(to: string, jobId: string) {
  console.log('===========xSending completion email to=================')
  const accessToken = await oAuth2Client.getAccessToken();
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: process.env.GMAIL_USER,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
      accessToken: accessToken.token,
    },
  });
  const reportUrl = `https://x-bed8-git-vivamed-nicks-projects-c58c13c7.vercel.app/report/${jobId}`
  console.log(`Sending completion email to ${to} for job ${jobId}`)
  
  const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Analysis Complete - Insight Engine</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f4f4f4;
            }
            
            .email-container {
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px 20px;
                text-align: center;
            }
            
            .header h1 {
                font-size: 28px;
                font-weight: 600;
                margin-bottom: 10px;
            }
            
            .header p {
                font-size: 16px;
                opacity: 0.9;
            }
            
            .content {
                padding: 40px 30px;
            }
            
            .success-icon {
                text-align: center;
                margin-bottom: 30px;
            }
            
            .success-icon .icon {
                width: 80px;
                height: 80px;
                background: linear-gradient(135deg, #4CAF50, #45a049);
                border-radius: 50%;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-size: 40px;
                color: white;
            }
            
            .message {
                text-align: center;
                margin-bottom: 30px;
            }
            
            .message h2 {
                color: #2c3e50;
                font-size: 24px;
                margin-bottom: 15px;
                font-weight: 600;
            }
            
            .message p {
                color: #555;
                font-size: 16px;
                margin-bottom: 20px;
            }
            
            .cta-button {
                text-align: center;
                margin: 30px 0;
            }
            
            .cta-button a {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-decoration: none;
                padding: 15px 30px;
                border-radius: 25px;
                font-size: 16px;
                font-weight: 600;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            }
            
            .cta-button a:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
            }
            
            .job-details {
                background-color: #f8f9fa;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
                border-left: 4px solid #667eea;
            }
            
            .job-details h3 {
                color: #2c3e50;
                font-size: 18px;
                margin-bottom: 10px;
            }
            
            .job-details p {
                color: #666;
                font-size: 14px;
                margin: 5px 0;
            }
            
            .footer {
                background-color: #f8f9fa;
                padding: 20px 30px;
                text-align: center;
                border-top: 1px solid #e9ecef;
            }
            
            .footer p {
                color: #666;
                font-size: 14px;
                margin-bottom: 10px;
            }
            
            .social-links {
                margin-top: 15px;
            }
            
            .social-links a {
                color: #667eea;
                text-decoration: none;
                margin: 0 10px;
                font-size: 14px;
            }
            
            @media only screen and (max-width: 600px) {
                .email-container {
                    margin: 10px;
                    border-radius: 4px;
                }
                
                .header {
                    padding: 20px 15px;
                }
                
                .header h1 {
                    font-size: 24px;
                }
                
                .content {
                    padding: 30px 20px;
                }
                
                .cta-button a {
                    padding: 12px 25px;
                    font-size: 14px;
                }
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                <h1>🎉 Analysis Complete!</h1>
                <p>Your document has been successfully processed</p>
            </div>
            
            <div class="content">
                <div class="success-icon">
                    <div class="icon">✓</div>
                </div>
                
                <div class="message">
                    <h2>Great news!</h2>
                    <p>Your document analysis has been completed successfully. We've generated comprehensive insights and actionable recommendations based on your content.</p>
                </div>
                
                <div class="job-details">
                    <h3>📋 Job Details</h3>
                    <p><strong>Job ID:</strong> ${jobId}</p>
                    <p><strong>Status:</strong> ✅ Completed</p>
                    <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
                </div>
                
                <div class="cta-button">
                    <a href="${reportUrl}">📊 View Your Report</a>
                </div>
                
                <div class="message">
                    <p style="font-size: 14px; color: #666;">
                        Your report contains detailed analysis, key insights, and actionable recommendations to help you make informed decisions.
                    </p>
                </div>
            </div>
            
            <div class="footer">
                <p>Thank you for using vivamed!</p>
                <p>If you have any questions, feel free to reach out to our support team.</p>
                <div class="social-links">
                    <a href="#">Support</a> | 
                    <a href="#">Documentation</a> | 
                    <a href="#">Contact Us</a>
                </div>
            </div>
        </div>
    </body>
    </html>
  `;
  
  await transporter.sendMail({
    from: process.env.NODEMAILER_FROM || "dev.meerdev@gmail.com",
    to,
    subject: "🎉 Your vivamed Analysis is Complete!",
    text: `Your analysis for job ${jobId} is complete. View your report here: ${reportUrl}`,
    html: htmlTemplate,
  })
}

export async function sendErrorEmail(to: string, jobId: string, errorMessage: string) {
  console.log(`Sending error email to ${to} for job ${jobId}`)
  const accessToken = await oAuth2Client.getAccessToken();
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: process.env.GMAIL_USER,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
      accessToken: accessToken.token,
    },
  });
  
  const errorHtmlTemplate = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Analysis Error - Insight Engine</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f4f4f4;
            }
            
            .email-container {
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            
            .header {
                background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
                color: white;
                padding: 30px 20px;
                text-align: center;
            }
            
            .header h1 {
                font-size: 28px;
                font-weight: 600;
                margin-bottom: 10px;
            }
            
            .header p {
                font-size: 16px;
                opacity: 0.9;
            }
            
            .content {
                padding: 40px 30px;
            }
            
            .error-icon {
                text-align: center;
                margin-bottom: 30px;
            }
            
            .error-icon .icon {
                width: 80px;
                height: 80px;
                background: linear-gradient(135deg, #ff6b6b, #ee5a24);
                border-radius: 50%;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-size: 40px;
                color: white;
            }
            
            .message {
                text-align: center;
                margin-bottom: 30px;
            }
            
            .message h2 {
                color: #2c3e50;
                font-size: 24px;
                margin-bottom: 15px;
                font-weight: 600;
            }
            
            .message p {
                color: #555;
                font-size: 16px;
                margin-bottom: 20px;
            }
            
            .error-details {
                background-color: #fff5f5;
                border: 1px solid #fed7d7;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
                border-left: 4px solid #ff6b6b;
            }
            
            .error-details h3 {
                color: #c53030;
                font-size: 18px;
                margin-bottom: 10px;
            }
            
            .error-details p {
                color: #666;
                font-size: 14px;
                margin: 5px 0;
                word-break: break-word;
            }
            
            .cta-button {
                text-align: center;
                margin: 30px 0;
            }
            
            .cta-button a {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-decoration: none;
                padding: 15px 30px;
                border-radius: 25px;
                font-size: 16px;
                font-weight: 600;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            }
            
            .cta-button a:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
            }
            
            .footer {
                background-color: #f8f9fa;
                padding: 20px 30px;
                text-align: center;
                border-top: 1px solid #e9ecef;
            }
            
            .footer p {
                color: #666;
                font-size: 14px;
                margin-bottom: 10px;
            }
            
            .social-links {
                margin-top: 15px;
            }
            
            .social-links a {
                color: #667eea;
                text-decoration: none;
                margin: 0 10px;
                font-size: 14px;
            }
            
            @media only screen and (max-width: 600px) {
                .email-container {
                    margin: 10px;
                    border-radius: 4px;
                }
                
                .header {
                    padding: 20px 15px;
                }
                
                .header h1 {
                    font-size: 24px;
                }
                
                .content {
                    padding: 30px 20px;
                }
                
                .cta-button a {
                    padding: 12px 25px;
                    font-size: 14px;
                }
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                <h1>⚠️ Processing Error</h1>
                <p>We encountered an issue with your document</p>
            </div>
            
            <div class="content">
                <div class="error-icon">
                    <div class="icon">!</div>
                </div>
                
                <div class="message">
                    <h2>We're sorry</h2>
                    <p>We encountered an issue while processing your document. Our team has been notified and we're working to resolve this as quickly as possible.</p>
                </div>
                
                <div class="error-details">
                    <h3>📋 Error Details</h3>
                    <p><strong>Job ID:</strong> ${jobId}</p>
                    <p><strong>Status:</strong> ❌ Failed</p>
                    <p><strong>Error:</strong> ${errorMessage}</p>
                </div>
                
                <div class="cta-button">
                    <a href="${process.env.BASE_URL || 'https://your-app.com'}">🔄 Try Again</a>
                </div>
                
                <div class="message">
                    <p style="font-size: 14px; color: #666;">
                        If this issue persists, please contact our support team for assistance. We're here to help!
                    </p>
                </div>
            </div>
            
            <div class="footer">
                <p>Thank you for using Insight Engine!</p>
                <p>Our support team is available to help resolve any issues.</p>
                <div class="social-links">
                    <a href="#">Support</a> | 
                    <a href="#">Contact Us</a> | 
                    <a href="#">Help Center</a>
                </div>
            </div>
        </div>
    </body>
    </html>
  `;
  
  await transporter.sendMail({
    from: process.env.NODEMAILER_FROM || "dev.meerdev@gmail.com",
    to,
    subject: "⚠️ There was a problem with your Insight Engine Analysis",
    text: `We're sorry, but there was an error processing your document for job ${jobId}.\n\nError: ${errorMessage}\n\nPlease try again or contact support.`,
    html: errorHtmlTemplate,
  })
}
