// ===================================================
// FILE: src/utils/validate.js
// ===================================================
import { ZodError } from 'zod';

export async function validateRequest(c, schema) {
  try {
    let data;
    
    // Parse berdasarkan content-type
    const contentType = c.req.header('content-type') || '';
    
    if (contentType.includes('application/json')) {
      data = await c.req.json();
    } else if (contentType.includes('multipart/form-data')) {
      data = await c.req.parseBody();
    } else {
      data = c.req.query();
    }
    
    // Validasi dengan Zod
    const validated = await schema.parseAsync(data);
    return { success: true, data: validated };
    
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      
      return {
        success: false,
        error: {
          message: 'Validasi gagal',
          details: errors
        }
      };
    }
    
    return {
      success: false,
      error: {
        message: 'Terjadi kesalahan saat validasi',
        details: error.message
      }
    };
  }
}

export function validateParams(c, schema) {
  try {
    const params = c.req.param();
    console.log('Validating params:', params); // Debug
    
    // Validasi dengan Zod
    const validated = schema.parse(params);
    return { success: true, data: validated };
    
  } catch (error) {
    console.error('Validate params error:', error);
    
    if (error instanceof ZodError) {
      const errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      
      return {
        success: false,
        error: {
          message: 'Parameter tidak valid',
          details: errors
        }
      };
    }
    
    return { 
      success: false, 
      error: { 
        message: error.message || 'Parameter tidak valid' 
      } 
    };
  }
}

export function validateQuery(c, schema) {
  try {
    const query = c.req.query();
    console.log('Validating query:', query); // Debug
    
    const validated = schema.parse(query);
    return { success: true, data: validated };
    
  } catch (error) {
    console.error('Validate query error:', error);
    
    if (error instanceof ZodError) {
      const errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      
      return {
        success: false,
        error: {
          message: 'Query parameter tidak valid',
          details: errors
        }
      };
    }
    return { 
      success: false, 
      error: { 
        message: error.message || 'Query tidak valid' 
      } 
    };
  }
}