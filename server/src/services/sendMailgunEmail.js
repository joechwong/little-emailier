import fetch from 'node-fetch';
import failoverEmail from './failoverEmail';

/**
 * This is the the send email service using Mailgun as the service provider.
 * If Mailgun failed, it will failover to Sendgrid.
 *
 * @param emailModel JSON input from the user
 * @param errorResponseFromPrimaryProvider Failure error from the primary email service provider
 * @return message array of the send email response
 *
 * The return message array contains the successful response if the email is accepted and queued by the primary service provider.
 *      ["Email is accepted and queued for delivery by Mailgun"]
 *
 * The return message array contains the failure response of the primary service provider and successful response
 * if the failed over email is accepted and queued by this service provider as the secondary provider.
 *      ["Sendgrid 400 - The subject is required. You can get around this requirement if you use a template with a subject
 *            defined or if every personalization has a subject defined.",
 *       "Email is accepted and queued for delivery by Mailgun"]
 */

const { MAILGUN_BASE_URL, MAILGUN_DOMAIN_NAME, MAILGUN_API_KEY } = process.env;

const sendMailgunEmail = async (emailModel, errorResponseFromPrimaryProvider) => {
  const { from, to, cc, bcc, subject, text } = emailModel || {};
  /**
   * Verified with Mailgun api that 'from', 'to' and 'text' are mandatory
   * We can return appropriate error instead of calling the api
   */
  if (!to?.length) return [`Mailgun - 'to' recipient is missing`];
  if (!text) return ['Mailgun - body text is missing'];

  try {
    const mailgunEmailModel = new URLSearchParams();
    mailgunEmailModel.append('from', from);
    mailgunEmailModel.append('to', `${to.join()}`);
    if (cc?.length) mailgunEmailModel.append('cc', `${cc.join()}`);
    if (bcc?.length) mailgunEmailModel.append('bcc', `${bcc.join()}`);
    if (subject) mailgunEmailModel.append('subject', subject);
    mailgunEmailModel.append('text', text);
    console.log('mailgunEmailModel ', mailgunEmailModel);

    const url = `${MAILGUN_BASE_URL}${MAILGUN_DOMAIN_NAME}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64')}`,
      },
      body: mailgunEmailModel,
    });
    console.log('mailgun response ', response);
    const { status: httpStatus } = response;

    if (httpStatus === 200) {
      const successResponse = ['Email is accepted and queued for delivery by Mailgun'];
      return errorResponseFromPrimaryProvider
        ? [errorResponseFromPrimaryProvider, ...successResponse]
        : successResponse;
    }

    let errorResponse = `Mailgun ${httpStatus}`;
    if (httpStatus === 401)
      /**
       * Mailgun does not return a valid JSON response for 401. Handle this error scenario explicitly.
       */
      errorResponse += ' - UNAUTHORIZED: No valid API key provided';
    else {
      const responseJson = await response.json();
      console.log('mailgun response json ', responseJson);
      errorResponse += ` - ${responseJson.message}`;
    }
    /**
     * Failover to different provider if receiving 500, 502, 503, 504 server error, 429 API request limit has been reached
     * and 401 unauthorized access due to invalid API Key
     *
     * Since it is difficult to replicate server error, I have used the 'from' as the test case to failover to Sendgrid.
     */
    if ([500, 502, 503, 504, 429, 401].includes(httpStatus) || !from)
      return failoverEmail({ emailModel, fromProvider: 'mailgun', errorResponse });

    /**
     * For all other error status codes [400, 401, 402, 404, 413], return the error from service provide.
     */
    return [errorResponse];
  } catch (e) {
    console.error('sendMailgunEmail error ', e.message);
    return failoverEmail({
      emailModel,
      fromProvider: 'mailgun',
      errorResponse: `Mailgun exception error: ${e.message}`,
    });
  }
};

export default sendMailgunEmail;
