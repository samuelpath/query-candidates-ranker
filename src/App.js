import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import "./App.css"; // Importing CSS

const App = () => {
  const [items, setItems] = useState({});
  const [originalItems, setOriginalItems] = useState({});
  const [currentQueryIndex, setCurrentQueryIndex] = useState(0);
  const [fileName, setFileName] = useState("");
  const [rerankedQueries, setRerankedQueries] = useState(new Set());
  const [submitCount, setSubmitCount] = useState(0);

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const query = Object.keys(items).find(
      (key) => toDroppableId(key) === result.source.droppableId,
    );
    const copyItems = { ...items };
    const [reorderedItem] = copyItems[query].splice(result.source.index, 1);
    copyItems[query].splice(result.destination.index, 0, reorderedItem);
    setItems(copyItems);
    if (
      JSON.stringify(copyItems[query]) !== JSON.stringify(originalItems[query])
    ) {
      setRerankedQueries(rerankedQueries.add(query));
    }
  };

  const toDroppableId = (query) => query.replace(/[^a-z0-9]/gi, "");

  // Helper function to shuffle an array
  const shuffle = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const lines = evt.target.result
        .split("\n")
        .filter((line) => line.trim() !== "");
      let jsonObjects = lines.map((line) => JSON.parse(line));
      jsonObjects = shuffle(jsonObjects); // Shuffle the array of JSON objects
      const newItems = {};
      jsonObjects.forEach((obj) => {
        newItems[obj.query] = obj.ranked_candidates;
      });
      setItems(newItems);
      setOriginalItems(JSON.parse(JSON.stringify(newItems))); // Store the original order of the candidates
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    const jsonlString = Object.entries(items)
      .filter(([query]) => rerankedQueries.has(query)) // Filter out queries that haven't been re-ranked
      .map(([query, ranked_candidates]) =>
        JSON.stringify({ query, ranked_candidates }),
      )
      .join("\n");
    const blob = new Blob([jsonlString], { type: "text/plain;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    const exportedFileName = fileName.replace(".jsonl", "_ranked.jsonl"); // Create the exported file name
    link.download = exportedFileName;
    link.click();
    URL.revokeObjectURL(href);
  };

  const handleSubmit = () => {
    setSubmitCount(submitCount + 1); // Increment the submitCount state variable
    if (currentQueryIndex < Object.keys(items).length - 1) {
      setCurrentQueryIndex(currentQueryIndex + 1);
    }
  };

  const queries = Object.keys(items);
  const currentQuery = queries[currentQueryIndex];
  const rankedCandidates = items[currentQuery];

  return (
    <div className="app">
      <h1 className="title">JSONL candidates ranking</h1>
      {Object.keys(items).length > 0 && (
        <h2 className="counter">
          Query {currentQueryIndex + 1} of {Object.keys(items).length}
        </h2>
      )}
      <input
        type="file"
        onChange={handleFileUpload}
        accept=".jsonl"
        className="upload-button"
      />
      <button
        onClick={handleExport}
        className="export-button"
        disabled={Object.keys(items).length === 0}
      >
        Export
      </button>
      {currentQuery && (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="query-section">
            <h2>{currentQuery}</h2>
            <Droppable droppableId={toDroppableId(currentQuery)}>
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="droppable-area"
                >
                  {rankedCandidates.map((candidate, index) => (
                    <Draggable
                      key={`${toDroppableId(currentQuery)}-${index}`}
                      draggableId={`${toDroppableId(currentQuery)}-${index}`}
                      index={index}
                    >
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="draggable-item"
                        >
                          <pre>
                            <strong>Rank {index + 1}:</strong> {candidate}
                          </pre>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        </DragDropContext>
      )}
      {submitCount < Object.keys(items).length && (
        <button onClick={handleSubmit} className="submit-button">
          Submit
        </button>
      )}
    </div>
  );
};

export default App;
