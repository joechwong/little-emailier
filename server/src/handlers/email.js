console.log('loading email function');
import { json } from 'body-parser';
import cors from 'cors';
import express from 'express';
import * as serverless from 'serverless-http';
import processEmail from '../services/processEmail';

/**
 * This is the email handler and express router accepting the request from API Gateway and process the email.
 *
 * @param req the body of the req contains the JSON input from the user
 */
const app = express();
app.use(cors());
app.use(json({ strict: false }));

app.post('/api/emails', async (req, res) => {
  try {
    const response = await processEmail(req.body);
    res.json(response);
  } catch (e) {
    console.error(e);
    res.status(500).json([e.message]);
  }
});

// eslint-disable-next-line import/prefer-default-export
export const handler = serverless(app);
