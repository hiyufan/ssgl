import pytest

from app.utils.json_parse import parse_json


def test_parses_plain_json():
    assert parse_json('{"a": 1}') == {"a": 1}


def test_strips_markdown_fence():
    raw = 'Here you go:\n```json\n{"score": 88, "ok": true}\n```\nDone.'
    assert parse_json(raw) == {"score": 88, "ok": True}


def test_finds_first_brace_block_as_last_resort():
    raw = 'noise {"x": [1,2,3]} trailing'
    assert parse_json(raw) == {"x": [1, 2, 3]}


def test_raises_on_no_json():
    with pytest.raises(ValueError):
        parse_json("totally not json")


def test_strips_fence_with_nested_object():
    raw = '```json\n{"score": 88, "breakdown": {"a": 1, "b": 2}}\n```'
    assert parse_json(raw) == {"score": 88, "breakdown": {"a": 1, "b": 2}}
