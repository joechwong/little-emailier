import fetch from 'node-fetch';
import failoverEmail from './failoverEmail';

/**
 * This is the the send email service using Sendgrid as the service provider.
 * If Sendgrid failed, it will failover to Mailgun.
 *
 * @param emailModel JSON input from the user
 * @param errorResponseFromPrimaryProvider Failure error from the primary email service provider
 * @return message array of the send email response
 *
 * The return message array contains the successful response if the email is accepted and queued by the primary service provider.
 *      ["Email is accepted and queued for delivery by Sendgrid"]
 *
 * The return message array contains the failure response of the primary service provider and successful response
 * if the failed over email is accepted and queued by this service provider as the secondary provider.
 *      ["Mailgun 401 - UNAUTHORIZED: No valid API key provided",
 *       "Email is accepted and queued for delivery by Sendgrid"]
 */

const { SENDGRID_BASE_URL, SENDGRID_API_KEY } = process.env;

const sendSendgridEmail = async (emailModel, errorResponseFromPrimaryProvider) => {
  const { from, to, cc, bcc, subject, text } = emailModel || {};
  /**
   * Verified with Sendgrid api that 'from', 'to', 'text' and 'subject' are mandatory
   * We can return appropriate error instead of calling the api
   *
   * Note:
   *    'subject' is not checked here as I have used it as failover test case when Sendgrid is the Primary provider.
   *    'from' is not checked and I have provided a default email below to cater for the failover test case when Sendgrid is the Secondary provider.
   */
  if (!to?.length) return [`Sendgrid - 'to' recipient is missing`];
  if (!text) return ['Sendgrid - body text is missing'];

  const sendgridEmailModel = {
    personalizations: [{ to: to.map(email => ({ email })) }],
    from: { email: from || 'joechwong@gmail.com' },
    subject,
    content: [{ type: 'text/plain', value: text }],
  };
  if (cc?.length) sendgridEmailModel.personalizations[0].cc = cc.map(email => ({ email }));
  if (bcc?.length) sendgridEmailModel.personalizations[0].bcc = bcc.map(email => ({ email }));
  console.log('sendgridEmailModel ', JSON.stringify(sendgridEmailModel, null, 2));

  try {
    const response = await fetch(SENDGRID_BASE_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
      },
      body: JSON.stringify(sendgridEmailModel),
    });

    console.log('sendgrid response ', response);
    const { status: httpStatus } = response;
    /**
     * Accord to api reference, there is no response body for 202 successful response.
     */
    if (httpStatus === 202) {
      const successResponse = ['Email is accepted and queued for delivery by Sendgrid'];
      return errorResponseFromPrimaryProvider
        ? [errorResponseFromPrimaryProvider, ...successResponse]
        : successResponse;
    }

    const responseJson = await response.json();
    console.log('sendgrid response json ', responseJson);

    const errorResponse = `Sendgrid ${httpStatus} - ${responseJson?.errors[0]?.message}`;
    /**
     * Failover to different provider if receiving 500 server error or 401 unauthorized access due to invalid API Key.
     *
     * Since it is difficult to replicate server error, I have used the 'subject' to test the failover to Mailgun.
     * The 'subject' is mandatory on Sendgrid but it's optional on Mailgun.
     */
    if ([500, 401].includes(httpStatus) || !subject)
      return failoverEmail({ emailModel, fromProvider: 'sendgrid', errorResponse });

    /**
     * For all other error status codes [400, 401, 403, 404, 413], return the error from service provide.
     */
    return [errorResponse];
  } catch (e) {
    console.error('sendSendgridEmail error ', e.message);
    return failoverEmail({
      emailModel,
      fromProvider: 'sendgrid',
      errorResponse: `Sendgrid exception error: ${e.message}`,
    });
  }
};

export default sendSendgridEmail;
