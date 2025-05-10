// Client-side test utility for debugging project transfer functionality
import { debugTransferProject } from '../services/api';

/**
 * Test utility to manually transfer a project to the current user
 * @param {string} projectId - ID of the project to purchase
 * @param {string} sellerId - ID of the project seller
 * @returns {Promise<Object>} - Result of the transfer operation
 */
export const testProjectTransfer = async (projectId, sellerId) => {
  console.log('Testing debug project transfer...');
  
  try {
    if (!projectId || !sellerId) {
      throw new Error('Project ID and seller ID are required');
    }
    
    console.log(`Attempting to transfer project ${projectId} from seller ${sellerId}...`);
    
    // Call the debug transfer endpoint
    const result = await debugTransferProject(projectId, sellerId);
    console.log('Debug transfer result:', result);
    
    return {
      success: true,
      message: 'Project transferred successfully!',
      data: result
    };
  } catch (error) {
    console.error('Debug transfer error:', error);
    return {
      success: false,
      message: error.response?.data?.error || error.message || 'Unknown error during transfer',
      error
    };
  }
};

/**
 * This function can be called from the browser console with:
 * 
 * import('./utils/test-transfer.js').then(module => {
 *   module.runDebugTransfer('project_id', 'seller_id');
 * });
 */
export const runDebugTransfer = async (projectId, sellerId) => {
  const result = await testProjectTransfer(projectId, sellerId);
  console.log('Transfer test result:', result);
  
  if (result.success) {
    alert('Project transferred successfully! Refresh the page to see it in your dashboard.');
  } else {
    alert(`Transfer failed: ${result.message}`);
  }
  
  return result;
};

export default testProjectTransfer; 