// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract StreamBoxPayment {
    struct Purchase {
        address buyer;
        address creator;
        string videoId;
        uint256 amount;
        uint256 timestamp;
        bool completed;
    }
    
    mapping(bytes32 => Purchase) public purchases;
    mapping(address => uint256) public creatorEarnings;
    mapping(string => address) public videoCreators;
    mapping(string => uint256) public videoPrices;
    
    event VideoPurchased(
        bytes32 indexed purchaseId,
        address indexed buyer,
        address indexed creator,
        string videoId,
        uint256 amount
    );
    
    event CreatorPaid(
        address indexed creator,
        uint256 amount
    );
    
    event VideoListed(
        string indexed videoId,
        address indexed creator,
        uint256 price
    );
    
    modifier onlyVideoCreator(string memory videoId) {
        require(videoCreators[videoId] == msg.sender, "Only video creator can perform this action");
        _;
    }
    
    function listVideo(string memory videoId, uint256 price) external {
        require(bytes(videoId).length > 0, "Video ID cannot be empty");
        require(price > 0, "Price must be greater than 0");
        
        videoCreators[videoId] = msg.sender;
        videoPrices[videoId] = price;
        
        emit VideoListed(videoId, msg.sender, price);
    }
    
    function purchaseVideo(string memory videoId) external payable {
        require(bytes(videoId).length > 0, "Video ID cannot be empty");
        require(videoCreators[videoId] != address(0), "Video does not exist");
        require(videoPrices[videoId] > 0, "Video price not set");
        require(msg.value >= videoPrices[videoId], "Insufficient payment");
        
        address creator = videoCreators[videoId];
        uint256 price = videoPrices[videoId];
        
        bytes32 purchaseId = keccak256(abi.encodePacked(msg.sender, videoId, block.timestamp));
        
        purchases[purchaseId] = Purchase({
            buyer: msg.sender,
            creator: creator,
            videoId: videoId,
            amount: price,
            timestamp: block.timestamp,
            completed: false
        });
        
        // Transfer payment to creator (95% to creator, 5% platform fee)
        uint256 creatorAmount = (price * 95) / 100;
        uint256 platformFee = price - creatorAmount;
        
        creatorEarnings[creator] += creatorAmount;
        
        // Send payment to creator immediately
        (bool success, ) = payable(creator).call{value: creatorAmount}("");
        require(success, "Payment to creator failed");
        
        purchases[purchaseId].completed = true;
        
        // Refund excess payment
        if (msg.value > price) {
            (bool refundSuccess, ) = payable(msg.sender).call{value: msg.value - price}("");
            require(refundSuccess, "Refund failed");
        }
        
        emit VideoPurchased(purchaseId, msg.sender, creator, videoId, price);
        emit CreatorPaid(creator, creatorAmount);
    }
    
    function hasPurchased(address buyer, string memory videoId) external view returns (bool) {
        bytes32 purchaseId = keccak256(abi.encodePacked(buyer, videoId, block.timestamp));
        return purchases[purchaseId].completed;
    }
    
    function getVideoPrice(string memory videoId) external view returns (uint256) {
        return videoPrices[videoId];
    }
    
    function getVideoCreator(string memory videoId) external view returns (address) {
        return videoCreators[videoId];
    }
    
    function getCreatorEarnings(address creator) external view returns (uint256) {
        return creatorEarnings[creator];
    }
}