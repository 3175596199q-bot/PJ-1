const JWT = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI5ZWUzOWI2MS1kOWRhLTRjNTktYTYwYy0wYzcxMzhlMjBmYjAiLCJlbWFpbCI6IjMxNzU1OTYxOTlAcXEuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6ImUwYTM2OTgwZDRiNjY2ZjdmMWUwIiwic2NvcGVkS2V5U2VjcmV0IjoiY2ExZDZiYTYzNGE0MGZjMGI3N2ZhZTczMzA3MTk2NDY1NzdiYjZhZDU4ODFhNTYwYjFjYTVhMGYwZjQ4YmM4ZiIsImV4cCI6MTc2NjMwODY3OX0.L8VoQEcWbVhVwKN79nTCVqe-6wmCeY7H5aafmXNIFT8`;
let CID: string; // 定义 CID 变量用于存储 IpfsHash
const fetchFromApi = ({ path, method, body, }: { path: string; method: string; body?: object }) => {
  const headers = {
    "Content-Type": "application/json",
    ...(body ? { "Authorization": `Bearer ${JWT}` } : {}),
  };

  return fetch(path, {
    method,
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      console.log(data); // 打印获取到的数据
      return data; // 返回数据以继续链式调用
    })
    .catch(error => console.error("Error:", error));
};

export const addToIPFS = (yourJSON: object) => {
  return fetchFromApi({
    path: `https://api.pinata.cloud/pinning/pinJSONToIPFS`,
    method: "POST",
    body: {
      pinataMetadata: { name: "nftsMetadata.json" },
      pinataContent: yourJSON,
    },
  }).then(data => {
    const CID = data.IpfsHash; // 获取返回的 IpfsHash
    console.log(CID);
    return { ...data, CID }; // 返回数据和 CID 以继续链式调用
  });
};


// export const getMetadataFromIPFS = (ipfsHash: string) => {
//   return fetchFromApi({
//     path: `/api/ipfs/get-metadata`,
//     method: "POST",
//     body: { ipfsHash },
//   });
// };
export const getMetadataFromIPFS = async (CID: any) => {
  try {
    const response = await fetch(`https://gateway.pinata.cloud/ipfs/${CID}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching data from IPFS:", error);
    throw error;
  }
};

