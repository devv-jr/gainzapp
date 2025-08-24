import { routineService } from '../services/routineService';

console.log('Testing routineService:', routineService);
console.log('getAllRoutines method:', routineService.getAllRoutines);
console.log('generateRecommendedRoutines method:', routineService.generateRecommendedRoutines);

// Test basic functionality
const testService = async () => {
  try {
    console.log('Testing getAllRoutines...');
    const routines = await routineService.getAllRoutines();
    console.log('Routines result:', routines);
  } catch (error) {
    console.error('Error in test:', error);
  }
};

export { testService };
