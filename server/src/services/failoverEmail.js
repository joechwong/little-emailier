import sendMailgunEmail from './sendMailgunEmail';
import sendSendgridEmail from './sendSendgridEmail';

/**
 * This is the email failover service to handler failover from the Primary service provider
 * and call the different email service provider to send the email.
 *
 * @param emailModel JSON input from the user
 * @param fromProvider The provider which calling the failover service
 * @param errorResponse Failure error from the provider calling the failover service
 * @return message array of the send email response
 *
 * If the primary provider failed, and the secondary provider also failed, it's not necessary to failover
 * from secondary provider back to the primary provider. Hence, the failover, if any, is only processed
 * once per request, so that it won't go into endless loop.
 *
 * The failover service keeps track of the failure errors from both primary and secondary providers,
 * which will be returned to the user.
 *
 * Example 1 - If Mailgun failed over to Sendgrid successfully, the returned message will be:
 *      ["Mailgun 401 - UNAUTHORIZED: No valid API key provided",
 *       "Email is accepted and queued for delivery by Sendgrid"]
 *
 * Example 2 - If both Sendgrid and Mailgun failed, the returned message will be:
 *      ["Sendgrid 400 - The subject is required. You can get around this requirement if you use a template with a
 *           subject defined or if every personalization has a subject defined.",
 *       "Mailgun 401 - UNAUTHORIZED: No valid API key provided"]
 */

const { PRIMARY_SERVICE_PROVIDER } = process.env;

let combinedErrorResponses;

const failoverEmail = async ({ emailModel, fromProvider, errorResponse }) => {
  /**
   * When the calling 'fromProvider' is the Primary provider, simply set/reset the 'combinedErrorResponses' array
   * to the error of the failed primary provider. This global variable is used to stack up the error messages
   * should the Secondary provider also failed.  Hence, instead of failing over back to the Primary provider, it
   * push the error of the failed secondary provider to 'combinedErrorResponses' and return it to the user.
   */

  if (PRIMARY_SERVICE_PROVIDER === fromProvider) combinedErrorResponses = [errorResponse];
  else combinedErrorResponses = [...combinedErrorResponses, errorResponse];

  /**
   * As this service needs to handle the reciprocal failover gracefully, it only calls the Secondary provider
   * when the calling 'fromProvider' is the Primary provider.  If the calling 'fromProvider' is the Secondary
   * provider, then it means both providers failed to deliver the email and it would not be necessary to
   * failover back to the Primary provider.
   */
  if (PRIMARY_SERVICE_PROVIDER === fromProvider) {
    if (PRIMARY_SERVICE_PROVIDER === 'mailgun') return sendSendgridEmail(emailModel, errorResponse);
    if (PRIMARY_SERVICE_PROVIDER === 'sendgrid') return sendMailgunEmail(emailModel, errorResponse);
  }
  return combinedErrorResponses;
};

export default failoverEmail;
