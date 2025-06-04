import React, { useState, useEffect, Fragment } from 'react';
import ForgeReconciler, { Text, Heading } from '@forge/react';
import { invoke } from '@forge/bridge';

const App = () => {
  // State for child issues
  const [childIssues, setChildIssues] = useState([]);
  const [childIssuesError, setChildIssuesError] = useState(null);

  // Fetch child issues on mount
  useEffect(() => {
    const fetchChildIssues = async () => {
      const resp = await invoke('getChildIssues');
      setChildIssues(resp.childIssues || []);
      setChildIssuesError(resp.error || null);
    };
    fetchChildIssues();
  }, []);

  return (
    <Fragment>
      {childIssuesError && (
        <Text appearance="error">Error loading child issues: {childIssuesError}</Text>
      )}
      {childIssues.length > 0 && (
        <Fragment>
          <Heading size="medium">Child Issues</Heading>
          {childIssues.map((issue) => (
            <Fragment key={issue.key}>
              <Text emphasis="strong">{issue.summary}</Text>
              <Text>
                (Status: {issue.status}, Assignee: {issue.assignee})
              </Text>
            </Fragment>
          ))}
        </Fragment>
      )}
    </Fragment>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
