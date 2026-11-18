// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title Agent Board
/// @notice A public on-chain board where ONLY Binance Agent ID holders can post
///         and tip each other. Agent ID is the access key, the identity, and the
///         payment rail: posts are keyed to the holder's address, and tips are
///         forwarded straight to the post author. No custody, no admin powers,
///         no owner role, no upgrades.
/// @dev Flat contract, no external imports, custom errors (not revert strings)
///      to keep deployment cheap. Agent ID is the SPACE ID Agent ID ERC-721 on
///      BNB Chain (non-transferable). An address holds an Agent ID iff
///      balanceOf(address) > 0.
///      Reads are via events: the frontend lists posts from PostCreated logs
///      and tip totals from Tipped logs, so no pagination getters are needed.
interface IAgentID {
    function balanceOf(address owner) external view returns (uint256);
}

contract AgentBoard {
    /// @notice SPACE ID Agent ID contract on BNB Chain.
    address public constant AGENT_ID = 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F;

    error NotAgentHolder();
    error BadText();
    error BadTag();
    error NoSuchPost();
    error NoTip();
    error TipFailed();

    struct Post {
        address author;
        string text;
        string tag;
        uint256 tipsReceived; // total wei tipped to this post
    }

    Post[] private _posts;

    event PostCreated(uint256 indexed postId, address indexed author, string text, string tag, uint256 timestamp);
    event Tipped(uint256 indexed postId, address indexed from, address indexed author, uint256 amount, uint256 timestamp);

    modifier onlyAgentHolder() {
        if (IAgentID(AGENT_ID).balanceOf(msg.sender) == 0) revert NotAgentHolder();
        _;
    }

    /// @notice Publish a post. Only Agent ID holders can post.
    /// @param text The post body, 1-500 bytes.
    /// @param tag A short label (e.g. "offer", "intro", "looking"), 0-32 bytes.
    /// @return postId The id of the new post.
    function post(string calldata text, string calldata tag) external onlyAgentHolder returns (uint256 postId) {
        if (bytes(text).length == 0 || bytes(text).length > 500) revert BadText();
        if (bytes(tag).length > 32) revert BadTag();
        postId = _posts.length;
        _posts.push(Post({author: msg.sender, text: text, tag: tag, tipsReceived: 0}));
        emit PostCreated(postId, msg.sender, text, tag, block.timestamp);
    }

    /// @notice Tip a post's author. Only Agent ID holders can tip.
    ///         The full tip is forwarded to the author immediately; this
    ///         contract never holds funds and has no withdrawal function.
    /// @param postId The post to tip.
    function tip(uint256 postId) external payable onlyAgentHolder {
        if (postId >= _posts.length) revert NoSuchPost();
        if (msg.value == 0) revert NoTip();
        _posts[postId].tipsReceived += msg.value;
        emit Tipped(postId, msg.sender, _posts[postId].author, msg.value, block.timestamp);
        (bool ok, ) = payable(_posts[postId].author).call{value: msg.value}("");
        if (!ok) revert TipFailed();
    }

    /// @notice Total number of posts.
    function getPostCount() external view returns (uint256) {
        return _posts.length;
    }
}
