-- Migration: Add credit_note column to orders table
-- This column stores credit note information as JSONB
-- Run this SQL in Supabase Dashboard > SQL Editor

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS credit_note JSONB DEFAULT NULL;

-- Add comment to document the structure
COMMENT ON COLUMN orders.credit_note IS 'Credit note information: { creditNoteNumber: string, creditNoteDate: string, amount: number (negative), pdfUrl: string }';

-- Create index for faster queries on credit notes
CREATE INDEX IF NOT EXISTS idx_orders_credit_note ON orders USING GIN (credit_note);
