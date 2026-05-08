# REST API Tutorial: What is REST?
REST is an acronym for REpresentational State Transfer and an architectural style for distributed hypermedia systems. Roy Fielding first presented it in 2000 in his famous dissertation. Since then, it has become one of the most widely used approaches for building web-based APIs (Application Programming Interfaces).

REST is not a protocol or a standard; it is an architectural style. During the development phase, API developers can implement REST in a variety of ways.

A Web API (or Web Service) conforming to the REST architectural style is called a REST API (or RESTful API).

## 1. The Six Guiding Principles of REST
REST is based on constraints and principles that promote simplicity, scalability, and statelessness.

### 1.1. Uniform Interface
By applying the principle of generality to the component interface, we simplify the system architecture and improve the visibility of interactions.

Identification of resources: Each resource must be uniquely identified (e.g., via URIs).

Manipulation of resources through representations: Consumers use these representations to modify the resource state.

Self-descriptive messages: Each message carries enough information to describe how to process it.

Hypermedia as the engine of application state (HATEOAS): The client drives interactions dynamically through hyperlinks.

### 1.2. Client-Server
This design pattern enforces the separation of concerns. By separating UI concerns from data storage, we improve portability and scalability.

### 1.3. Stateless
Each request from the client to the server must contain all of the information necessary to understand and complete the request. The server cannot store any session context.

### 1.4. Cacheable
Responses must label themselves as cacheable or non-cacheable to allow clients to reuse data for equivalent requests.

### 1.5. Layered System
An architecture can be composed of hierarchical layers (e.g., MVC pattern). Each component cannot see beyond the immediate layer they are interacting with.

### 1.6. Code on Demand (Optional)
REST allows client functionality to be extended by downloading and executing code (e.g., applets or scripts).

## 2. What is a Resource?
The key abstraction in REST is a resource. Any information that can be named is a resource: a document, an image, a person, etc. The state of the resource at any time is the resource representation, consisting of:

The data

Metadata

Hypermedia links

### 2.1. Resource Identifiers
REST uses URIs to identify each resource involved in client-server interactions.

### 2.2. Hypermedia
The data format is known as a media type. Hypermedia means the simultaneous presentation of information and controls (links) through which the user obtains choices.

### 2.3. Example (JSON)
JSON
{
  "id": 123,
  "title": "What is REST", 
  "content": "REST is an architectural style for building web services...",
  "published_at": "2023-11-04T14:30:00Z",
  "author": {
    "id": 456,
    "name": "John Doe",
    "profile_url": "https://example.com/authors/456"
  },
  "comments": {
    "count": 5,
    "comments_url": "https://example.com/posts/123/comments"
  },
  "self": {
    "link": "https://example.com/posts/123"
  }
}
## 3. Resource Methods
Resource methods are used to perform transitions between states. While often mapped to HTTP methods (GET, POST, PUT, DELETE), REST does not strictly mandate a specific protocol, only a uniform interface.

## 4. REST and HTTP are Not the Same
REST != HTTP. While REST is commonly implemented over HTTP, Roy Fielding’s dissertation does not mandate any protocol preference. Any interface honoring the six guiding principles is RESTful.

## 5. Summary
Data and functionality are considered resources.

Resources are accessed via URIs.

Resources are decoupled from their representation (HTML, XML, JSON, etc.).

Interactions must be stateless.