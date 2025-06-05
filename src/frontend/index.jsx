import React, { useState, useEffect, Fragment } from 'react';
import ForgeReconciler, { Text } from '@forge/react';
import { invoke } from '@forge/bridge';

const App = () => {
  const [launchItems, setLaunchItems] = useState([]);
  const [launchItemsError, setLaunchItemsError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLaunchItems = async () => {
      setIsLoading(true);
      try {
        const resp = await invoke('getChildIssues');
        setLaunchItems(resp.childIssues || []);
        setLaunchItemsError(resp.error || null);
      } catch (error) {
        setLaunchItemsError(`Failed to load data: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLaunchItems();
  }, []);

  const isDoneStatus = (statusCategory, statusName) => {
    if (statusCategory === 'Done') return true;
    const doneStatuses = ['Done', 'Closed', 'Resolved', 'Complete', 'Completed'];
    return doneStatuses.some(doneStatus => 
      statusName.toLowerCase().includes(doneStatus.toLowerCase())
    );
  };

  if (isLoading) {
    return <Text>Loading Product Launch Signoff Status...</Text>;
  }

  const completedItems = launchItems.filter(item => 
    isDoneStatus(item.statusCategory, item.status)
  ).length;

  return (
    <Fragment>
      <Text>🚀 Product Launch Signoff Status</Text>
      
      {launchItemsError && (
        <Text>❌ Error: {launchItemsError}</Text>
      )}
      
      <Text>📊 Progress: {completedItems} of {launchItems.length} items completed</Text>
      
      {launchItems.length > 0 ? (
        <Fragment>
          {launchItems.map((item) => {
            const isComplete = isDoneStatus(item.statusCategory, item.status);
            const indicator = isComplete ? '✅' : '❌';
            
            return (
              <Fragment key={item.key}>
                <Text>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</Text>
                <Text>{indicator} {item.summary}</Text>
                <Text>Key: {item.key}</Text>
                <Text>Assignee: {item.assignee}</Text>
                <Text>Priority: {item.priority}</Text>
                <Text>Status: {item.status}</Text>
                <Text> </Text>
              </Fragment>
            );
          })}
          
          <Text>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</Text>
          <Text>
            🚀 Launch Status: {completedItems === launchItems.length ? 'READY TO LAUNCH!' : 'IN PROGRESS'}
          </Text>
        </Fragment>
      ) : (
        <Fragment>
          <Text>No launch gates found. Create subtasks to track launch requirements.</Text>
        </Fragment>
      )}
    </Fragment>
  );
};

ForgeReconciler.render(<App />);
