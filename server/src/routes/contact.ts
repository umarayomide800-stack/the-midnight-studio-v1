import { Router } from 'express';
import { Resend } from 'resend';
import { z } from 'zod';
import { ApiError } from '../middleware/error.js';

const router = Router();
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email().max(320),
  message: z.string().trim().min(10).max(4000)
});

router.post('/contact', async (request, response, next) => {
  try {
    const input = contactSchema.parse(request.body);
    const recipient = process.env.OWNER_EMAIL ?? 'umarayomide700@gmail.com';
    if (!resend || !process.env.EMAIL_FROM) {
      throw new ApiError(503, 'Contact email is not configured yet.', 'CONTACT_EMAIL_NOT_CONFIGURED');
    }
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: [recipient],
      replyTo: input.email,
      subject: `Website enquiry from ${input.name}`,
      text: `Name: ${input.name}\nEmail: ${input.email}\n\n${input.message}`
    });
    if (result.error) throw new ApiError(502, 'Contact message could not be sent.', 'CONTACT_EMAIL_FAILED');
    response.status(201).json({ success: true, data: { sent: true } });
  } catch (error) {
    next(error);
  }
});

export default router;