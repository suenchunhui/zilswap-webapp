import { Box, BoxProps, Button, Divider } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { ArrowDropDownOutlined, ArrowDropUpOutlined } from "@material-ui/icons";
import { AmountLabel, ContrastBox, KeyValueDisplay, PoolLogo, Text } from "app/components";
import { RewardsState, RootState, TokenInfo, TokenState } from "app/store/types";
import { AppTheme } from "app/theme/types";
import { BIG_ZERO } from "app/utils/constants";
import { Link } from "react-router-dom";
import cls from "classnames";
import React, { useState } from "react";
import { actions } from "app/store";
import { useDispatch, useSelector } from "react-redux";
import { ZilswapConnector } from "core/zilswap";
import { bnOrZero, toHumanNumber } from "app/utils/strings/strings";
import { useValueCalculators } from "app/utils";
import { ZWAPRewards } from "core/zwap";

interface Props extends BoxProps {
  token: TokenInfo;
};

const useStyles = makeStyles((theme: AppTheme) => ({
  root: {
  },
  buttonWrapper: {
    borderRadius: theme.spacing(.5),
    padding: theme.spacing(1),
  },
  divider: {
    backgroundColor: "rgba(20,155,163,0.3)",
    margin: theme.spacing(1, 0),
  },
  removeButton: {
    borderRadius: theme.spacing(.5),
  },
}));

const PoolInfoDropdown: React.FC<Props> = (props: Props) => {
  const { children, className, token, ...rest } = props;
  const classes = useStyles();
  const valueCalculators = useValueCalculators();
  const dispatch = useDispatch();
  const rewardsState = useSelector<RootState, RewardsState>((state) => state.rewards);
  const tokenState = useSelector<RootState, TokenState>((state) => state.token);
  const [active, setActive] = useState<boolean>(false);
  const poolPair: [string, string] = [token.symbol, "ZIL"];

  const onToggleDropdown = () => {
    setActive(!active);
  };

  const {
    poolShareLabel,
    tokenAmount,
    zilAmount,
    poolShare,
  } = React.useMemo(() => {
    const poolShare = token.pool?.contributionPercentage.shiftedBy(-2);
    const tokenAmount = poolShare?.times(token.pool?.tokenReserve ?? BIG_ZERO);
    const zilAmount = poolShare?.times(token.pool?.zilReserve ?? BIG_ZERO);

    return {
      poolShareLabel: poolShare?.shiftedBy(2).decimalPlaces(3).toString(10) ?? "",
      tokenAmount,
      zilAmount,
      poolShare: poolShare ?? BIG_ZERO,
    }
  }, [token]);

  const {
    potentialRewards,
    depositedValue,
    rewardsValue,
    roiLabel,
  } = React.useMemo(() => {
    if (!ZilswapConnector.network || !rewardsState.epochInfo) return {
      rewardsValue: BIG_ZERO,
      potentialRewards: BIG_ZERO,
      depositedValue: BIG_ZERO,
      roiLabel: "-",
    };

    const poolRewards = bnOrZero(rewardsState.potentialPoolRewards[token.address]);

    const zapContractAddr = ZWAPRewards.TOKEN_CONTRACT[ZilswapConnector.network] ?? "";
    const zapToken = tokenState.tokens[zapContractAddr];

    const rewardsValue = valueCalculators.amount(tokenState.prices, zapToken, poolRewards);
    const poolValue = valueCalculators.pool(tokenState.prices, token);
    const depositedValue = poolShare.times(poolValue);
    const roiPerEpoch = rewardsValue.dividedBy(depositedValue);
    const epochDuration = rewardsState.epochInfo.raw.epoch_period;
    const secondsInDay = 24 * 3600;
    const roiPerDay = bnOrZero(roiPerEpoch.dividedBy(epochDuration).times(secondsInDay).shiftedBy(2).decimalPlaces(2));

    return {
      potentialRewards: poolRewards,
      rewardsValue,
      depositedValue,
      roiLabel: roiPerDay.isZero() ? "-" : `${toHumanNumber(roiPerDay, 2)}%`,
    };
  }, [rewardsState.epochInfo, rewardsState.potentialPoolRewards, poolShare, token, tokenState.prices, tokenState.tokens, valueCalculators]);

  const onGotoAdd = () => {
    const network = ZilswapConnector.network;
    dispatch(actions.Pool.select({ token, network }));
    dispatch(actions.Layout.showPoolType("add"));
  };

  const onGotoRemove = () => {
    const network = ZilswapConnector.network;
    dispatch(actions.Pool.select({ token, network }));
    dispatch(actions.Layout.showPoolType("remove"));
  };

  return (
    <Box {...rest} className={cls(classes.root, className)}>
      <Button variant="text" fullWidth className={classes.buttonWrapper} onClick={onToggleDropdown}>
        <Box flex={1} display="flex" alignItems="center">
          <PoolLogo pair={poolPair} tokenAddress={token.address} />
          <Text marginLeft={1}>{poolPair.join(" - ")}</Text>
          <Box flex={1} />
          {active && <ArrowDropUpOutlined color="primary" />}
          {!active && <ArrowDropDownOutlined color="primary" />}
        </Box>
      </Button>
      {active && (
        <ContrastBox>
          <KeyValueDisplay marginBottom={1.5} kkey="Your Potential Rewards" ValueComponent="span">
            <Text color="primary">
              {toHumanNumber(potentialRewards.shiftedBy(-12))} ZWAP
            </Text>
            <Text variant="body2" color="textSecondary" align="right">
              ≈${toHumanNumber(rewardsValue, 2)}
            </Text>
          </KeyValueDisplay>
          <KeyValueDisplay marginBottom={1.5} kkey="ROI" ValueComponent="span">
            <Text color="textPrimary">{roiLabel} / daily</Text>
          </KeyValueDisplay>
          <KeyValueDisplay kkey={`Your Pool Share ${poolShareLabel}%`} ValueComponent="span">
            <AmountLabel
              justifyContent="flex-end"
              marginBottom={1}
              currency={token.symbol}
              address={token.address}
              amount={tokenAmount}
              compression={token.decimals} />
            <AmountLabel
              justifyContent="flex-end"
              currency="ZIL"
              address=""
              amount={zilAmount} />
            <Text variant="body2" color="textSecondary" align="right">
              ≈${toHumanNumber(depositedValue, 2)}
            </Text>
          </KeyValueDisplay>

          <Box display="flex" marginTop={3}>
            <Button
              onClick={onGotoAdd}
              variant="contained"
              color="primary"
              fullWidth>
              Add
            </Button>
            <Box margin={1} />
            <Button
              onClick={onGotoRemove}
              className={classes.removeButton}
              component={Link}
              to="/pool"
              variant="outlined"
              color="primary"
              fullWidth>
              Remove
            </Button>
          </Box>
        </ContrastBox>
      )}
      <Divider className={classes.divider} />
    </Box>
  );
};

export default PoolInfoDropdown;
