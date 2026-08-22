import os
import glob
from typing import List

try:
    from sentence_transformers import SentenceTransformer
    import faiss
    import numpy as np
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False

class KnowledgeRAG:
    def __init__(self, data_dir: str = "data/knowledge"):
        self.data_dir = data_dir
        self.chunks = []
        self.index = None
        self.model = None
        self.is_demo = not SENTENCE_TRANSFORMERS_AVAILABLE

    def initialize(self):
        if self.is_demo:
            print("Running RAG in demo mode (sentence-transformers not available)")
            self._load_chunks_only()
            return
            
        try:
            self.model = SentenceTransformer('all-MiniLM-L6-v2')
            self._load_and_index()
        except Exception as e:
            print(f"Error initializing RAG: {e}. Falling back to demo mode.")
            self.is_demo = True
            self._load_chunks_only()

    def _load_chunks_only(self):
        self.chunks = []
        files = glob.glob(os.path.join(self.data_dir, "*.md"))
        for f in files:
            with open(f, "r") as file:
                content = file.read()
                # Dummy chunking
                paragraphs = content.split("\n\n")
                self.chunks.extend(paragraphs)
                
    def _load_and_index(self):
        self._load_chunks_only()
        if not self.chunks:
            return
            
        embeddings = self.model.encode(self.chunks)
        d = embeddings.shape[1]
        self.index = faiss.IndexFlatL2(d)
        self.index.add(np.array(embeddings).astype('float32'))

    def retrieve(self, query: str, top_k: int = 3) -> List[str]:
        if self.is_demo or self.index is None or not self.chunks:
            # Demo return
            return [
                "Demo knowledge: Water levels above 1.5m are dangerous.",
                "Demo knowledge: Evacuate vulnerable populations first."
            ]
            
        query_vector = self.model.encode([query]).astype('float32')
        distances, indices = self.index.search(query_vector, min(top_k, len(self.chunks)))
        
        results = []
        for idx in indices[0]:
            if idx < len(self.chunks) and idx >= 0:
                results.append(self.chunks[idx])
        return results

rag_system = KnowledgeRAG()
