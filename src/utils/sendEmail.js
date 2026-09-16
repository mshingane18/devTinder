const sendPasswordResetEmail = async (user, resetUrl) => {
  if (!process.env.BREVO_API_KEY || !process.env.BREVO_SENDER_EMAIL) {
    throw new Error("Brevo email configuration is missing");
  }

  let response;
  try {
    response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: process.env.BREVO_SENDER_NAME || "DevTinder",
          email: process.env.BREVO_SENDER_EMAIL,
        },
        to: [
          {
            email: user.emailId,
            name: user.firstName,
          },
        ],
        subject: "Reset your DevTinder password",
        htmlContent: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 24px;">
            <h1 style="color: #4f46e5;">DevTinder</h1>
            <p>Hi ${user.firstName},</p>
            <p>We received a request to reset your DevTinder password.</p>
            <p>
              <a href="${resetUrl}" style="display: inline-block; padding: 12px 20px; background: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 6px;">Reset Password</a>
            </p>
            <p>This link expires in 15 minutes.</p>
            <p>If you did not request a password reset, you can safely ignore this email.</p>
            <p style="font-size: 12px; color: #6b7280;">If the button does not work, copy and paste this URL into your browser:<br />${resetUrl}</p>
          </div>
        `,
      }),
    });
  } catch (err) {
    throw new Error(
      `Brevo network request failed: ${err.cause?.message || err.message}`,
    );
  }

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Brevo request failed with status ${response.status}: ${errorBody.slice(0, 500)}`,
    );
  }
};

module.exports = { sendPasswordResetEmail };
