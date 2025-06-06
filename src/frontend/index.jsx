import React, { useState, useEffect, Fragment } from 'react';
import ForgeReconciler, { Text, DynamicTable, Button, Modal, ModalBody, ModalTransition, ModalTitle, ModalFooter, ModalHeader } from '@forge/react';
import { invoke } from '@forge/bridge';

const App = () => {
  const [launchItems, setLaunchItems] = useState([]);
  const [launchItemsError, setLaunchItemsError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSignoffModal, setShowSignoffModal] = useState(false);
  const [isSignedOff, setIsSignedOff] = useState(false);

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

  const isNotApplicableStatus = (statusCategory, statusName) => {
    const naStatuses = [
      'Not Applicable', 'N/A', 'NA', 'Not Required', 'Not Needed',
      'Skip', 'Skipped', 'Won\'t Do', 'Wont Do', 'Will Not Do',
      'Cancelled', 'Canceled', 'Not Relevant', 'Irrelevant',
      'Out of Scope', 'Not in Scope', 'Excluded', 'Exempted'
    ];
    return naStatuses.some(naStatus => 
      statusName.toLowerCase().includes(naStatus.toLowerCase())
    );
  };

  const getStatusIndicator = (statusCategory, statusName) => {
    // Check for Not Applicable first, before checking for Done status
    if (isNotApplicableStatus(statusCategory, statusName)) {
      return 'N/A';
    } else if (isDoneStatus(statusCategory, statusName)) {
      return '✅';
    } else {
      return '❌';
    }
  };

  if (isLoading) {
    return <Text>Loading Product Launch Signoff Status...</Text>;
  }

  const completedItems = launchItems.filter(item => 
    isDoneStatus(item.statusCategory, item.status)
  ).length;
  
  const notApplicableItems = launchItems.filter(item => 
    isNotApplicableStatus(item.statusCategory, item.status)
  ).length;
  
  const pendingItems = launchItems.length - completedItems - notApplicableItems;
  const isReadyForSignoff = pendingItems === 0 && launchItems.length > 0;

  const handleSignoffClick = () => {
    setShowSignoffModal(true);
  };

  const handleSignoffConfirm = () => {
    if (isReadyForSignoff) {
      setIsSignedOff(true);
      setShowSignoffModal(false);
    }
  };

  const handleModalClose = () => {
    setShowSignoffModal(false);
  };

  // Create table head configuration
  const head = {
    cells: [
      {
        key: 'launch-gate',
        content: 'Launch Gate',
        isSortable: true,
        width: 40
      },
      {
        key: 'assignee',
        content: 'Assignee',
        isSortable: true,
        width: 20
      },
      {
        key: 'priority',
        content: 'Priority',
        isSortable: true,
        width: 15
      },
      {
        key: 'status',
        content: 'Status',
        isSortable: true,
        width: 15
      },
      {
        key: 'complete',
        content: 'Complete',
        isSortable: true,
        width: 10
      }
    ]
  };

  // Create table rows from launch items
  const rows = launchItems.map((item, index) => {
    const indicator = getStatusIndicator(item.statusCategory, item.status);
    
    return {
      key: `row-${index}-${item.key}`,
      cells: [
        {
          key: 'launch-gate',
          content: item.summary
        },
        {
          key: 'assignee',
          content: item.assignee || 'Unassigned'
        },
        {
          key: 'priority',
          content: item.priority || 'None'
        },
        {
          key: 'status',
          content: item.status
        },
        {
          key: 'complete',
          content: indicator
        }
      ]
    };
  });

  return (
    <Fragment>
      <Text>🚀 Product Launch Signoff Status</Text>
      <Text> </Text>
      
      {launchItemsError && (
        <Fragment>
          <Text>❌ Error: {launchItemsError}</Text>
          <Text> </Text>
        </Fragment>
      )}
      
      <Text>📊 Progress: {completedItems} of {launchItems.length} items completed</Text>
      <Text> </Text>
      
      {launchItems.length > 0 ? (
        <Fragment>
          <DynamicTable
            caption="Product Launch Signoff Tracking"
            head={head}
            rows={rows}
            rowsPerPage={10}
            isLoading={false}
            defaultSortKey="complete"
            defaultSortOrder="ASC"
            emptyView="No launch gates found. Create subtasks to track launch requirements."
          />
          <Text> </Text>
          <Text>🚀 Launch Status: {isReadyForSignoff ? 'READY TO LAUNCH!' : 'IN PROGRESS'}</Text>
          
          {/* Signoff Panel */}
          <Text> </Text>
          <Text>━━━━━━━━━━━━━━━━━ EXECUTIVE SIGNOFF ━━━━━━━━━━━━━━━━━</Text>
          {isSignedOff ? (
            <Fragment>
              <Text>✅ LAUNCH APPROVED AND SIGNED OFF</Text>
              <Text>This product launch has been officially approved for release.</Text>
            </Fragment>
          ) : (
            <Fragment>
              <Button 
                text={isReadyForSignoff ? "Sign Off on Launch" : "Review Launch Status"}
                appearance={isReadyForSignoff ? "primary" : "warning"}
                onClick={handleSignoffClick}
              />
              <Text>Executive approval required before launch can proceed.</Text>
            </Fragment>
          )}
        </Fragment>
      ) : (
        <Fragment>
          <Text>No launch gates found. Create subtasks to track launch requirements.</Text>
        </Fragment>
      )}

      {/* Professional Modal Dialog */}
      <ModalTransition>
        {showSignoffModal && (
          <Modal onClose={handleModalClose} width="medium">
            <ModalHeader>
              <ModalTitle appearance={isReadyForSignoff ? undefined : "warning"}>
                {isReadyForSignoff ? "Launch Signoff Confirmation" : "Launch Not Ready for Signoff"}
              </ModalTitle>
            </ModalHeader>
            <ModalBody>
              {isReadyForSignoff ? (
                <Fragment>
                  <Text>✅ All launch requirements have been completed.</Text>
                  <Text> </Text>
                  <Text>Launch Summary:</Text>
                  <Text>• {completedItems} items completed ✅</Text>
                  <Text>• {notApplicableItems} items marked as not applicable 🔲</Text>
                  <Text>• {pendingItems} items pending ⏸️</Text>
                  <Text> </Text>
                  <Text>🚀 Are you ready to officially sign off on this product launch?</Text>
                </Fragment>
              ) : (
                <Fragment>
                  <Text>⚠️ This launch is not ready for executive signoff.</Text>
                  <Text> </Text>
                  <Text>Outstanding requirements:</Text>
                  <Text>• {pendingItems} items still pending completion ❌</Text>
                  <Text>• {completedItems} items completed ✅</Text>
                  <Text>• {notApplicableItems} items marked as not applicable 🔲</Text>
                  <Text> </Text>
                  <Text>📋 Please ensure all launch gates are completed before requesting executive signoff.</Text>
                </Fragment>
              )}
            </ModalBody>
            <ModalFooter>
              {isReadyForSignoff ? (
                <Fragment>
                  <Button appearance="subtle" onClick={handleModalClose}>
                    Cancel
                  </Button>
                  <Button appearance="primary" onClick={handleSignoffConfirm}>
                    Confirm Launch Signoff
                  </Button>
                </Fragment>
              ) : (
                <Button appearance="primary" onClick={handleModalClose}>
                  Close
                </Button>
              )}
            </ModalFooter>
          </Modal>
        )}
      </ModalTransition>
    </Fragment>
  );
};

ForgeReconciler.render(<App />);
