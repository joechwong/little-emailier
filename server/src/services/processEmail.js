import sendMailgunEmail from './sendMailgunEmail';
import sendSendgridEmail from './sendSendgridEmail';

/**
 * This is the process email service which calls the Primary email service provider as pre-configured
 * under PRIMARY_SERVICE_PROVIDER with either 'mailgun' or 'sendgrid' in /server/config/email/serviceProvider.json.
 *
 *
 * @param emailModel JSON input from the user
 * @return message array of the process email response
 */

const { PRIMARY_SERVICE_PROVIDER } = process.env;

const processEmail = async emailModel => {
  if (PRIMARY_SERVICE_PROVIDER === 'mailgun') return sendMailgunEmail(emailModel);
  if (PRIMARY_SERVICE_PROVIDER === 'sendgrid') return sendSendgridEmail(emailModel);
  return [
    `Please setup primary email service provider to 'mailgun' or 'sendgrid' as per the configuration instructions on serverless lambda environment variables`,
  ];
};

export default processEmail;
