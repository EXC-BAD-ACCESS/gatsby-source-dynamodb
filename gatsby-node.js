var AWS = require('aws-sdk');

exports.sourceNodes = ( { actions, createNodeId, createContentDigest }, 
  options, 
) => {
  return new Promise((resolve, reject) => {
    const { createNode } = actions
    delete options.plugins

    
    AWS.config.update({
      endpoint: options.endpoint
    });
    
    var docClient = new AWS.DynamoDB.DocumentClient({
      region: options.region,
      accessKeyId: options.accessKeyId, 
      secretAccessKey: options.secretAccessKey
    });

    const processData = item => {
      const idField = options.fieldNameForNodeId || "id"
      const nodeId = item[idField]
        ? createNodeId(`dynamodb-${item[idField]}`)
        : nodeContentDigest

      const nodeContentDigest = createContentDigest(item)
      
      const nodeData = Object.assign({}, item, {
        id: nodeId,
        parent: null,
        children: [],
        internal: {
          mediaType: `text/html`,
          contentDigest: nodeContentDigest,
          type: options.typeName,
          content: JSON.stringify(item),
        },
      })
      return nodeData
    }

    const onScan = (err, data) => {
      if (err) {
        console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
        reject(err)
      } else {
        console.log("Query succeeded.");
        data.Items.forEach((item) => {
          const nodeData = processData(item)
          createNode(nodeData)
        });
    
        if (typeof data.LastEvaluatedKey != "undefined") {
          console.log("Scanning for more...");
          options.params.ExclusiveStartKey = data.LastEvaluatedKey;
          docClient.scan(options.params, onScan);
        } else {
          resolve()
        }
      }
    }
    docClient.scan(options.params, onScan);
  })
}
