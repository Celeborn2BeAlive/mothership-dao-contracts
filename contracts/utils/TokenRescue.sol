// SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TokenRescue is Ownable {
  using SafeERC20 for IERC20;

  function rescueERC20(IERC20 token, uint256 amount) external virtual onlyOwner {
    token.safeTransfer(msg.sender, amount);
  }

  // Note: if msg.sender is a contract, it must implement {IERC721Receiver-onERC721Received}
  function rescueERC721(IERC721 token, uint256 tokenId) external virtual onlyOwner {
    token.safeTransferFrom(address(this), msg.sender, tokenId);
  }

  // Note: if msg.sender is a contract, it must implement {IERC721Receiver-onERC721Received}
  function rescueERC1155(IERC1155 token, uint256 tokenId, uint256 amount) external virtual onlyOwner {
    token.safeTransferFrom(address(this), msg.sender, tokenId, amount, "");
  }

  // Note: if msg.sender is a contract, it must implement {IERC721Receiver-onERC721Received}
  function rescueERC1155Batch(IERC1155 token, uint256[] calldata tokenIds, uint256[] calldata amounts) external virtual onlyOwner {
    token.safeBatchTransferFrom(address(this), msg.sender, tokenIds, amounts, "");
  }
}
